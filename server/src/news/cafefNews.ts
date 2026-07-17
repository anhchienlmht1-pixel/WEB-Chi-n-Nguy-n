// Pulls market/stock news from CafeF. Two sources, tried in order:
//  1. CafeF's own per-symbol data page (cafef.vn/du-lieu/{exchange}/{symbol}.chn),
//     scraped for its "Tin tức" article links — genuinely per-stock, but the
//     page's HTML structure is unverified (this sandbox can't reach cafef.vn),
//     so this is a best-effort heuristic scrape, not a documented API.
//  2. CafeF's category RSS feeds (a stable, documented format), filtered by
//     ticker mention — used as a fallback when the page scrape finds nothing.
import { findSeed } from "../providers/universe.js";

export interface NewsItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source: string;
}

export interface SymbolNewsResult {
  items: NewsItem[];
  // How many articles were actually scanned, and which feed provided them —
  // surfaced to the client so a suspiciously empty match (e.g. 0 articles
  // scanned, or a handful from the wrong category) is distinguishable from
  // a real "nothing mentions this ticker right now".
  poolSize: number;
  usedFeed: string;
}

const FEEDS: { url: string; source: string }[] = [
  { url: "https://cafef.vn/thi-truong-chung-khoan.rss", source: "CafeF - Thị trường chứng khoán" },
  { url: "https://cafef.vn/chung-khoan.rss", source: "CafeF - Chứng khoán" },
  { url: "https://cafef.vn/tai-chinh-ngan-hang.rss", source: "CafeF - Tài chính ngân hàng" },
];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function cleanText(raw: string): string {
  const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  // CafeF descriptions sometimes embed an <img>/<a> in the CDATA — strip any
  // inner HTML tags since we only ever show plain text.
  return decodeXmlEntities((cdata ? cdata[1] : raw).replace(/<[^>]*>/g, "").trim());
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? cleanText(match[1]) : null;
}

function toIsoDate(pubDate: string | null): string {
  if (!pubDate) return new Date().toISOString();
  const parsed = new Date(pubDate);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function parseRssItems(xml: string, source: string): NewsItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!title || !link) continue;
    items.push({
      title,
      link,
      pubDate: toIsoDate(extractTag(block, "pubDate")),
      description: extractTag(block, "description") ?? undefined,
      source,
    });
  }
  return items;
}

async function fetchCafefPool(limit: number): Promise<{ items: NewsItem[]; usedFeed: string }> {
  const attempts: string[] = [];

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, { headers: HEADERS });
      const body = await res.text();
      if (!res.ok) {
        attempts.push(`${feed.url} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
        continue;
      }
      const items = parseRssItems(body, feed.source);
      if (items.length > 0) return { items: items.slice(0, limit), usedFeed: feed.url };
      attempts.push(`${feed.url} -> parsed 0 items. Raw preview: ${body.slice(0, 200)}`);
    } catch (err) {
      attempts.push(`${feed.url} -> ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw Object.assign(
    new Error(`Không lấy được tin tức từ CafeF. Chi tiết: ${attempts.join(" | ")}`),
    { status: 502 }
  );
}

export async function fetchCafefNews(limit = 20): Promise<NewsItem[]> {
  return (await fetchCafefPool(limit)).items;
}

function mentionsSymbol(item: NewsItem, symbol: string): boolean {
  const re = new RegExp(`\\b${symbol}\\b`, "i");
  return re.test(item.title) || re.test(item.description ?? "");
}

// Labels/buttons that show up as plain <a> links on CafeF's data pages but
// obviously aren't news headlines — filtered out of the scrape below.
const NON_HEADLINE_LABELS = new Set([
  "tổng quan",
  "thông tin cơ bản",
  "ban lãnh đạo & sở hữu",
  "tài chính",
  "tin tức",
  "tài liệu",
  "chọn mã ck cần theo dõi",
  "đọc thêm",
  "báo lỗi",
  "xem đồ thị kỹ thuật",
  "lịch sử gd",
  "tk đặt lệnh",
  "ndttnn",
]);

function looksLikeHeadline(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 20 || clean.length > 220) return false;
  if (!clean.includes(" ")) return false;
  return !NON_HEADLINE_LABELS.has(clean.toLowerCase());
}

// Best-effort scrape of a stock's own CafeF data page for its news links.
// We don't know the exact HTML structure (unverified — see file header), so
// this just grabs every link back into cafef.vn's article namespace (*.chn)
// with headline-shaped visible text, rather than targeting a specific
// selector that might not exist. Returns null (not []) on any failure, or if
// nothing survives filtering, so the caller falls back to the RSS pool
// instead of showing "no news" or (worse) unrelated site-wide headlines.
//
// The data page also carries CafeF's site-wide "mới nhất" ticker, which is
// unrelated to this specific stock but matches the same headline shape —
// so scraped candidates are additionally required to mention the ticker
// itself, same as the RSS fallback below.
async function fetchCafefSymbolPage(symbol: string, exchange: string, limit: number): Promise<NewsItem[] | null> {
  const url = `https://cafef.vn/du-lieu/${exchange.toLowerCase()}/${symbol.toLowerCase()}.chn`;
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    const linkRe = /<a[^>]+href="(https:\/\/cafef\.vn\/[a-z0-9\-/]+\.chn)"[^>]*>([^<]{5,220})<\/a>/gi;
    const seen = new Set<string>();
    const items: NewsItem[] = [];
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html))) {
      const link = m[1];
      const title = decodeXmlEntities(m[2].trim());
      if (link === url || seen.has(link) || !looksLikeHeadline(title)) continue;
      const candidate: NewsItem = { title, link, source: "CafeF" };
      if (!mentionsSymbol(candidate, symbol)) continue;
      seen.add(link);
      items.push(candidate);
    }
    return items.length > 0 ? items.slice(0, limit) : null;
  } catch {
    return null;
  }
}

export async function fetchNewsForSymbol(symbol: string, limit = 10): Promise<SymbolNewsResult> {
  const upper = symbol.toUpperCase();
  const seed = findSeed(upper);

  if (seed) {
    const pageItems = await fetchCafefSymbolPage(upper, seed.exchange, limit);
    if (pageItems) {
      return {
        items: pageItems,
        poolSize: pageItems.length,
        usedFeed: `https://cafef.vn/du-lieu/${seed.exchange.toLowerCase()}/${upper.toLowerCase()}.chn`,
      };
    }
  }

  // Fallback: CafeF's RSS feeds are category-wide (not per-stock), so this
  // filters the latest pool of articles by ticker mention.
  const { items: pool, usedFeed } = await fetchCafefPool(200);
  const items = pool.filter((item) => mentionsSymbol(item, upper)).slice(0, limit);
  return { items, poolSize: pool.length, usedFeed };
}
