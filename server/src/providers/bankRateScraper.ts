import type { BankDepositRateRow } from "../data/bankDepositRates.js";

// Live scrape of bank deposit rates from 24hmoney.vn's rate-comparison
// page, as a replacement for the one-off SSI-MCP snapshot in
// data/bankDepositRates.ts (that file stays as the staleOnError fallback
// — see routes/stocks.ts). Same confidence level as cafefFinancials.ts:
// the exact URL and table markup are an educated guess, not verified
// against a real fetch (this sandbox can't reach 24hmoney.vn to inspect
// it), so this scans generic <table> markup for recognizable bank-name
// text and term-header labels rather than a known CSS selector, and
// throws a diagnostic-rich error (HTML preview) on first failure — a
// first-try miss is the likely outcome, same as that file's own history.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

const CANDIDATE_URLS = ["https://24hmoney.vn/lai-suat-gui-ngan-hang", "https://24hmoney.vn/lai-suat-ngan-hang"];

const FETCH_TIMEOUT_MS = 8_000;

const TERM_KEYS = ["1", "3", "6", "9", "12", "13", "18", "24", "36"] as const;
type TermKey = (typeof TERM_KEYS)[number];

// Known bank names/aliases to recognize a row's first cell as a bank (not
// a header or a footnote) — longest-alias-first so "Vietcombank" doesn't
// get matched as a shorter unrelated substring first.
const BANK_ALIASES: { name: string; patterns: string[] }[] = [
  { name: "Vietcombank", patterns: ["vietcombank", "vcb"] },
  { name: "BIDV", patterns: ["bidv"] },
  { name: "VietinBank", patterns: ["vietinbank", "ctg"] },
  { name: "Agribank", patterns: ["agribank"] },
  { name: "MB", patterns: ["mbbank", "ngân hàng quân đội", " mb "] },
  { name: "VPBank", patterns: ["vpbank"] },
  { name: "Techcombank", patterns: ["techcombank", "tcb"] },
  { name: "ACB", patterns: ["acb"] },
  { name: "Sacombank", patterns: ["sacombank"] },
  { name: "HDBank", patterns: ["hdbank"] },
  { name: "SHB", patterns: ["shb"] },
  { name: "TPBank", patterns: ["tpbank"] },
  { name: "OCB", patterns: ["ocb"] },
  { name: "MSB", patterns: ["msb", "hàng hải"] },
  { name: "VIB", patterns: ["vib"] },
  { name: "SeABank", patterns: ["seabank"] },
  { name: "Eximbank", patterns: ["eximbank"] },
  { name: "SCB", patterns: ["scb"] },
  { name: "LPBank", patterns: ["lpbank", "bưu điện liên việt"] },
  { name: "ABBank", patterns: ["abbank"] },
  { name: "NamABank", patterns: ["nam á"] },
  { name: "BacABank", patterns: ["bắc á"] },
];

// A header cell's term, if it names one of our term buckets — matches
// "1 tháng", "1T", "01 tháng", etc.
function termFromHeaderCell(cell: string): TermKey | null {
  const m = cell.match(/(\d{1,2})\s*t(h|háng)?\b/i);
  if (!m) return null;
  const n = m[1].replace(/^0+/, "") || "0";
  return (TERM_KEYS as readonly string[]).includes(n) ? (n as TermKey) : null;
}

function bankNameFromCell(cell: string): string | null {
  const lower = cell.toLowerCase();
  for (const { name, patterns } of BANK_ALIASES) {
    if (patterns.some((p) => lower.includes(p))) return name;
  }
  return null;
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

function toRate(raw: string): number | null {
  const cleaned = raw.replace("%", "").replace(",", ".").trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 && n < 20 ? n : null;
}

function parseRateTable(html: string): BankDepositRateRow[] | null {
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch: RegExpExecArray | null;

  while ((tableMatch = tableRe.exec(html))) {
    const rowMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rowMatches.length < 3) continue;

    const rows: string[][] = rowMatches.map((rowMatch) =>
      [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) => stripTags(cellMatch[1]))
    );

    // Header row: whichever row has the most cells that name one of our
    // term buckets (title/date banners above it won't match any).
    let headerIdx = -1;
    let headerTermCols: { col: number; term: TermKey }[] = [];
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const cols: { col: number; term: TermKey }[] = [];
      rows[r].forEach((cell, c) => {
        const term = termFromHeaderCell(cell);
        if (term) cols.push({ col: c, term });
      });
      if (cols.length > headerTermCols.length) {
        headerTermCols = cols;
        headerIdx = r;
      }
    }
    if (headerIdx === -1 || headerTermCols.length < 3) continue;

    const result: BankDepositRateRow[] = [];
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const bank = row.length > 0 ? bankNameFromCell(row[0]) : null;
      if (!bank) continue;

      const terms: Record<TermKey, number | null> = {
        "1": null,
        "3": null,
        "6": null,
        "9": null,
        "12": null,
        "13": null,
        "18": null,
        "24": null,
        "36": null,
      };
      for (const { col, term } of headerTermCols) {
        const value = row[col] !== undefined ? toRate(row[col]) : null;
        if (value !== null) terms[term] = value;
      }
      if (Object.values(terms).some((v) => v !== null)) {
        result.push({ bank, terms });
      }
    }

    if (result.length >= 3) return result;
  }
  return null;
}

export interface LiveBankDepositRates {
  asOf: string;
  banks: BankDepositRateRow[];
}

export async function fetchLiveBankDepositRates(): Promise<LiveBankDepositRates> {
  let lastHtml = "";
  let lastUrl = "";

  for (const url of CANDIDATE_URLS) {
    let res: Response;
    try {
      res = await fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const html = await res.text();
    lastHtml = html;
    lastUrl = url;

    const banks = parseRateTable(html);
    if (banks) {
      return { asOf: new Date().toISOString().slice(0, 10), banks };
    }
  }

  const hintIdx = lastHtml.toLowerCase().indexOf("vietcombank");
  const preview =
    hintIdx >= 0
      ? stripTags(lastHtml.slice(Math.max(0, hintIdx - 200), hintIdx + 400))
      : lastHtml.slice(0, 300);

  throw Object.assign(
    new Error(
      `Không cào được bảng lãi suất tại ${lastUrl || CANDIDATE_URLS[0]}. ` +
        (hintIdx >= 0
          ? `Có thấy "Vietcombank" gần: ${preview}`
          : `Không thấy "Vietcombank" trong trang. Xem trước: ${preview}`)
    ),
    { status: 502 }
  );
}
