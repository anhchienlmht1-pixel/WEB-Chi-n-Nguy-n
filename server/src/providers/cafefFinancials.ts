import type { FinancialLineItem, FinancialReport, KbsPeriodType, KbsReportType } from "./kbsFinancials.js";
import { findSeed } from "./universe.js";

// CafeF — a fourth financial-reports source (tried alongside VNDirect, KBS,
// VCI; financials.ts picks whichever answers with the most periods).
// Confidence here is the lowest of the four: CafeF's per-symbol namespace
// (cafef.vn/du-lieu/{exchange}/{symbol}...) is confirmed live from the news
// scraper (cafefNews.ts, verified against a real user screenshot), but the
// financial-report page path and its HTML table structure are pure guesses
// — no equivalent real example to anchor on the way VCI's field names came
// from an actual vnstock output. This scrapes generic <table> markup for
// recognizable Vietnamese line-item labels rather than a known CSS
// selector, and throws a diagnostic-rich error (HTML preview around any
// recognizable keyword) if nothing parses, since a first-try failure here
// is the likely outcome and that preview is what a follow-up fix needs.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

const REPORT_SLUG: Record<KbsReportType, string> = {
  KQKD: "bao-cao-ket-qua-kinh-doanh",
  CDKT: "bao-cao-can-doi-ke-toan",
  LCTT: "bao-cao-luu-chuyen-tien-te",
  CSTC: "chi-so-tai-chinh",
};

const KEYWORD_HINT: Record<KbsReportType, string> = {
  KQKD: "Lợi nhuận sau thuế",
  CDKT: "Tổng tài sản",
  LCTT: "Lưu chuyển tiền",
  CSTC: "ROE",
};

function candidateUrls(symbol: string, exchange: string, reportType: KbsReportType): string[] {
  const base = `https://cafef.vn/du-lieu/${exchange.toLowerCase()}/${symbol.toLowerCase()}`;
  const slug = REPORT_SLUG[reportType];
  return [`${base}/${slug}.chn`, `${base}-${slug}.chn`];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".").trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function looksLikePeriodLabel(text: string): boolean {
  return /^(Q[1-4]\/?\d{4}|20\d{2})$/i.test(text.trim());
}

interface ParsedTable {
  periods: string[];
  rows: { name: string; values: (number | null)[] }[];
}

function parseFirstDataTable(html: string): ParsedTable | null {
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRe.exec(html))) {
    const tableHtml = tableMatch[1];
    const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rowMatches.length < 2) continue;

    const rows: string[][] = rowMatches.map((rowMatch) =>
      [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) => stripTags(cellMatch[1]))
    );

    const headerRow = rows[0];
    const periodCells = headerRow.slice(1).filter(looksLikePeriodLabel);
    if (periodCells.length < 2) continue;

    const dataRows = rows
      .slice(1)
      .map((cells) => ({ name: cells[0] ?? "", values: cells.slice(1, 1 + periodCells.length).map(toNumber) }))
      .filter((r) => r.name && r.values.some((v) => v !== null));

    if (dataRows.length === 0) continue;

    return { periods: periodCells, rows: dataRows };
  }
  return null;
}

export async function fetchCafefReport(
  symbol: string,
  reportType: KbsReportType,
  _periodType: KbsPeriodType
): Promise<FinancialReport> {
  const seed = findSeed(symbol);
  if (!seed) {
    throw Object.assign(new Error(`CafeF: không xác định được sàn niêm yết cho ${symbol}.`), { status: 502 });
  }
  const urls = candidateUrls(symbol, seed.exchange, reportType);
  let lastHtml = "";
  let lastUrl = "";

  for (const url of urls) {
    let res: Response;
    try {
      res = await fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(6000) });
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const html = await res.text();
    lastHtml = html;
    lastUrl = url;

    const parsed = parseFirstDataTable(html);
    if (!parsed) continue;

    const items: FinancialLineItem[] = parsed.rows.map((r, i) => ({
      id: `cafef-${i}`,
      name: r.name,
      nameEn: r.name,
      unit: "",
      levels: 0,
      values: r.values,
    }));

    return { periods: parsed.periods, items };
  }

  const hint = KEYWORD_HINT[reportType];
  const hintIdx = lastHtml.indexOf(hint);
  const preview =
    hintIdx >= 0
      ? stripTags(lastHtml.slice(Math.max(0, hintIdx - 200), hintIdx + 400))
      : lastHtml.slice(0, 300);

  throw Object.assign(
    new Error(
      `CafeF không tìm được bảng dữ liệu cho ${symbol} (${reportType}) tại ${lastUrl || urls[0]}. ` +
        (hintIdx >= 0
          ? `Có thấy từ khoá "${hint}" gần: ${preview}`
          : `Không thấy từ khoá "${hint}" trong trang. Xem trước: ${preview}`)
    ),
    { status: 502 }
  );
}
