// Pulls market/stock news from VnExpress's public RSS feeds. RSS 2.0 is a
// stable, documented format (unlike KBS's undocumented JSON API), so this is
// lower-risk than the price/financials providers — the only real unknown is
// which category slug VnExpress currently uses for stock-market news, since
// this sandbox can't reach vnexpress.net to verify it directly. We try a few
// known VnExpress RSS slugs in order and use whichever responds with items.
export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  source: string;
}

const FEEDS: { url: string; source: string }[] = [
  { url: "https://vnexpress.net/rss/kinh-doanh/chung-khoan.rss", source: "VnExpress - Chứng khoán" },
  { url: "https://vnexpress.net/rss/chung-khoan.rss", source: "VnExpress - Chứng khoán" },
  { url: "https://vnexpress.net/rss/kinh-doanh.rss", source: "VnExpress - Kinh doanh" },
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
  return decodeXmlEntities((cdata ? cdata[1] : raw).trim());
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

export async function fetchVnexpressNews(limit = 20): Promise<NewsItem[]> {
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
      if (items.length > 0) return items.slice(0, limit);
      attempts.push(`${feed.url} -> parsed 0 items. Raw preview: ${body.slice(0, 200)}`);
    } catch (err) {
      attempts.push(`${feed.url} -> ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw Object.assign(
    new Error(`Không lấy được tin tức từ VnExpress. Chi tiết: ${attempts.join(" | ")}`),
    { status: 502 }
  );
}
