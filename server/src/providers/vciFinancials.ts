import type { FinancialLineItem, FinancialReport, KbsPeriodType, KbsReportType } from "./kbsFinancials.js";

// Vietcap Securities (VCI) — a financial-reports source, tried alongside
// VNDirect and KBS (financials.ts picks whichever answers with the most
// periods).
//
// Every report type here (KQKD/CDKT/LCTT/CSTC) hits a REST endpoint
// verified directly against vnstock's open-source VCI explorer
// (github.com/thinh-vu/vnstock, vnstock/explorer/vci/{financial,const}.py —
// the `Finance` class's `_get_report`/`_get_ratio_dict` methods and the
// RATIO_COLUMN_MAP_VI/EN constants), cloned and read locally since this
// sandbox can't reach vietcap.com.vn directly to test the live response.
// The endpoint paths, request shapes (plain GET, no body), and field names
// are taken verbatim from that source — genuinely verified, not guessed.
// What's NOT verified (vnstock's own code doesn't pin this down cleanly
// either) is the exact response shape for edge cases — see comments at each
// parsing step for where a defensive assumption was made.
const VCIQ_BASE = "https://iq.vietcap.com.vn/api/iq-insight-service";
const HANDSHAKE_URL = "https://trading.vietcap.com.vn/priceboard";

const REST_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Origin: "https://trading.vietcap.com.vn",
  Referer: "https://trading.vietcap.com.vn/",
};

// vnstock's Finance class does a GET to /priceboard first and merges the
// resulting session cookies into every subsequent request's headers
// (vnstock/explorer/vci/financial.py Finance._handshake) — cheap to
// replicate and matches the verified reference exactly, so it's done here
// too rather than assuming the REST endpoints work cookie-less.
//
// Cached module-wide for a few minutes rather than re-handshaking on every
// single call — a sector-wide P/B scan (pbComparison.ts) fans this out
// across 13-27 symbols at once, and re-fetching /priceboard that many times
// for what should be the same session cookie would just be wasted latency.
let cachedCookie: { value: string | undefined; expiresAt: number } | null = null;
const COOKIE_TTL_MS = 5 * 60 * 1000;

async function handshakeCookies(): Promise<string | undefined> {
  if (cachedCookie && cachedCookie.expiresAt > Date.now()) return cachedCookie.value;
  let value: string | undefined;
  try {
    const res = await fetch(HANDSHAKE_URL, { headers: REST_HEADERS, signal: AbortSignal.timeout(5000) });
    const cookies = res.headers.getSetCookie?.() ?? [];
    // Each Set-Cookie value is "name=value; Path=...; HttpOnly..." — only
    // the name=value pair before the first ";" is meaningful for the next
    // request's own Cookie header.
    value = cookies.length > 0 ? cookies.map((c) => c.split(";")[0]).join("; ") : undefined;
  } catch {
    // Best-effort — vnstock itself just logs a warning and continues
    // without cookies on handshake failure, so this does too.
    value = undefined;
  }
  cachedCookie = { value, expiresAt: Date.now() + COOKIE_TTL_MS };
  return value;
}

async function restGet(path: string, params: Record<string, string>, symbolForError: string): Promise<any> {
  const cookie = await handshakeCookies();
  const headers = cookie ? { ...REST_HEADERS, Cookie: cookie } : REST_HEADERS;
  const query = new URLSearchParams(params).toString();
  const url = `${VCIQ_BASE}${path}${query ? `?${query}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`VCI không phản hồi cho ${symbolForError} (${path}): ${cause}`), { status: 504 });
  }
  const rawBody = await res.text();

  if (!res.ok) {
    throw Object.assign(
      new Error(`VCI trả lỗi HTTP ${res.status} cho ${symbolForError} (${path}). Nội dung: ${rawBody.slice(0, 400)}`),
      { status: 502 }
    );
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw Object.assign(
      new Error(`VCI trả dữ liệu không phải JSON cho ${symbolForError} (${path}): ${rawBody.slice(0, 200)}`),
      { status: 502 }
    );
  }
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// CSTC (ratio) — GET /v1/company/{symbol}/statistics-financial, no params.
// Field labels/units below are copied verbatim from vnstock's
// RATIO_COLUMN_MAP_VI/EN (vnstock/explorer/vci/const.py) — a curated subset
// of the ~50 fields that endpoint returns, matching what this app's own
// ratio extraction already looks for (client/src/utils/ratios.ts's
// PE_MATCH/PB_MATCH/ROE_MATCH/ROA_MATCH match on these exact Vietnamese
// labels via substring/regex, so reusing them verbatim keeps this source
// compatible with existing UI code for free) plus a few more commonly
// useful ones (market cap, margins, leverage).
// ---------------------------------------------------------------------------
const RATIO_FIELDS: { key: string; nameVi: string; nameEn: string; unit: string }[] = [
  { key: "pe", nameVi: "P/E", nameEn: "P/E", unit: "Lần" },
  { key: "pb", nameVi: "P/B", nameEn: "P/B", unit: "Lần" },
  { key: "ps", nameVi: "P/S", nameEn: "P/S", unit: "Lần" },
  { key: "roe", nameVi: "ROE (%)", nameEn: "ROE (%)", unit: "%" },
  { key: "roa", nameVi: "ROA (%)", nameEn: "ROA (%)", unit: "%" },
  { key: "marketCap", nameVi: "Vốn hóa", nameEn: "Market Cap", unit: "Tỷ VNĐ" },
  { key: "numberOfSharesMktCap", nameVi: "Số CP lưu hành (triệu)", nameEn: "Outstanding Shares (mil)", unit: "Triệu CP" },
  { key: "dividendYield", nameVi: "Tỷ suất cổ tức (%)", nameEn: "Dividend Yield (%)", unit: "%" },
  { key: "debtToEquity", nameVi: "Nợ trên vốn chủ", nameEn: "Debt to Equity", unit: "Lần" },
  { key: "currentRatio", nameVi: "Hệ số thanh toán hiện hành", nameEn: "Current Ratio", unit: "Lần" },
  { key: "quickRatio", nameVi: "Hệ số thanh toán nhanh", nameEn: "Quick Ratio", unit: "Lần" },
  { key: "grossMargin", nameVi: "Biên LN gộp (%)", nameEn: "Gross Margin (%)", unit: "%" },
  { key: "ebitMargin", nameVi: "Biên EBIT (%)", nameEn: "EBIT Margin (%)", unit: "%" },
  { key: "afterTaxProfitMargin", nameVi: "Biên LN sau thuế (%)", nameEn: "After-tax Profit Margin (%)", unit: "%" },
  { key: "ebit", nameVi: "EBIT", nameEn: "EBIT", unit: "Tỷ VNĐ" },
  { key: "ebitda", nameVi: "EBITDA", nameEn: "EBITDA", unit: "Tỷ VNĐ" },
];

function ratioRowQuarter(row: any): number | null {
  const q = Number(row?.quarter);
  return Number.isFinite(q) && q >= 1 && q <= 4 ? q : null;
}

function ratioRowYear(row: any): number | null {
  const y = Number(row?.year);
  return Number.isFinite(y) && y > 0 ? y : null;
}

// The verified endpoint's response shape (a flat array mixing quarterly and
// annual snapshots, distinguished by `ratioTTMId` vs `ratioYearId` per
// vnstock's const.py) isn't pinned down by vnstock's own parsing code
// closely enough to know for certain how a caller is meant to pick "just
// the quarterly rows" vs "just the annual rows" without live-testing the
// real response — so this filters defensively: rows carrying a 1-4
// `quarter` are treated as quarterly, everything else as annual, and if
// the requested period type has zero matching rows the other set is used
// instead of returning nothing.
function selectRatioRows(rows: any[], periodType: KbsPeriodType): any[] {
  const quarterly = rows.filter((r) => ratioRowQuarter(r) !== null);
  const annual = rows.filter((r) => ratioRowQuarter(r) === null && ratioRowYear(r) !== null);
  if (periodType === "quarter") return quarterly.length > 0 ? quarterly : annual;
  return annual.length > 0 ? annual : quarterly;
}

function periodSortValue(row: any): number {
  return (ratioRowYear(row) ?? 0) * 4 + (ratioRowQuarter(row) ?? 4);
}

function ratioPeriodLabel(row: any): string {
  const year = ratioRowYear(row);
  const quarter = ratioRowQuarter(row);
  return quarter ? `Q${quarter} ${year}` : String(year ?? "?");
}

async function fetchVciRatioReport(symbol: string, periodType: KbsPeriodType): Promise<FinancialReport> {
  const parsed = await restGet(`/v1/company/${encodeURIComponent(symbol)}/statistics-financial`, {}, symbol);
  const rows: any[] = parsed?.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error(`VCI trả về rỗng cho ${symbol} (CSTC).`), { status: 502 });
  }

  const selected = selectRatioRows(rows, periodType).sort((a, b) => periodSortValue(a) - periodSortValue(b));
  const periods = selected.map(ratioPeriodLabel);

  const items: FinancialLineItem[] = RATIO_FIELDS.map(({ key, nameVi, nameEn, unit }) => ({
    id: key,
    name: nameVi,
    nameEn,
    unit,
    levels: 0,
    values: selected.map((row) => toNumber(row[key])),
  }));

  const hasAnyValue = items.some((it) => it.values.some((v) => v !== null));
  if (!hasAnyValue) {
    throw Object.assign(new Error(`VCI trả về dữ liệu CSTC cho ${symbol} nhưng toàn bộ giá trị rỗng.`), {
      status: 502,
    });
  }

  return { periods, items };
}

// ---------------------------------------------------------------------------
// KQKD/CDKT/LCTT (income statement / balance sheet / cash flow) —
// GET /v1/company/{symbol}/financial-statement?section={SECTION}, response
// shaped as { data: { years: [...], quarters: [...] } } — one flat row per
// period, field codes as keys. Field codes aren't self-describing (no
// English/Vietnamese label on the row itself), so a second call to
// /v1/company/{symbol}/financial-statement/metrics fetches the code→label
// dictionary vnstock's _get_ratio_dict() also relies on.
// ---------------------------------------------------------------------------
const SECTION: Record<"KQKD" | "CDKT" | "LCTT", string> = {
  KQKD: "INCOME_STATEMENT",
  CDKT: "BALANCE_SHEET",
  LCTT: "CASH_FLOW",
};

// Columns present on every period row that are metadata, not line items —
// excluded from the item list even though they're not in the field
// dictionary either (dictionary only covers actual financial-statement
// codes).
const NON_ITEM_KEYS = new Set(["year", "yearReport", "quarter", "lengthReport", "reportPeriod", "ticker"]);

interface FieldDict {
  vi: Record<string, string>;
  en: Record<string, string>;
}

async function fetchFieldDict(symbol: string): Promise<FieldDict> {
  const parsed = await restGet(`/v1/company/${encodeURIComponent(symbol)}/financial-statement/metrics`, {}, symbol);
  const data = parsed?.data;
  const vi: Record<string, string> = {};
  const en: Record<string, string> = {};
  if (data && typeof data === "object") {
    // The metrics response groups fields by report section
    // (balance_sheet/income_statement/cash_flow) — merge every group into
    // one flat code→label lookup since a report row only ever carries
    // codes from its own section anyway.
    for (const group of Object.values(data)) {
      if (!Array.isArray(group)) continue;
      for (const entry of group as any[]) {
        const field = entry?.field;
        if (typeof field !== "string" || !field) continue;
        if (typeof entry?.titleVi === "string" && entry.titleVi) vi[field] = entry.titleVi;
        if (typeof entry?.titleEn === "string" && entry.titleEn) en[field] = entry.titleEn;
      }
    }
  }
  return { vi, en };
}

function statementRowQuarter(row: any): number | null {
  const raw = row?.quarter ?? row?.lengthReport;
  const q = Number(raw);
  return Number.isFinite(q) && q >= 1 && q <= 4 ? q : null;
}

function statementRowYear(row: any): number | null {
  const raw = row?.year ?? row?.yearReport;
  const y = Number(raw);
  return Number.isFinite(y) && y > 0 ? y : null;
}

function statementPeriodLabel(row: any, periodType: KbsPeriodType): string {
  const year = statementRowYear(row);
  const quarter = statementRowQuarter(row);
  return quarter && periodType === "quarter" ? `Q${quarter} ${year}` : String(year ?? "?");
}

async function fetchVciStatementReport(
  symbol: string,
  reportType: "KQKD" | "CDKT" | "LCTT",
  periodType: KbsPeriodType
): Promise<FinancialReport> {
  const section = SECTION[reportType];
  const [parsed, fieldDict] = await Promise.all([
    restGet(`/v1/company/${encodeURIComponent(symbol)}/financial-statement`, { section }, symbol),
    fetchFieldDict(symbol),
  ]);

  const data = parsed?.data;
  const targetKey = periodType === "year" ? "years" : "quarters";
  const rows: any[] = Array.isArray(data?.[targetKey]) ? data[targetKey] : [];
  if (rows.length === 0) {
    throw Object.assign(new Error(`VCI trả về rỗng cho ${symbol} (${reportType}, ${targetKey}).`), { status: 502 });
  }

  const sorted = [...rows].sort(
    (a, b) =>
      (statementRowYear(a) ?? 0) * 4 +
      (statementRowQuarter(a) ?? 4) -
      ((statementRowYear(b) ?? 0) * 4 + (statementRowQuarter(b) ?? 4))
  );
  const periods = sorted.map((row) => statementPeriodLabel(row, periodType));

  // Item columns: keys present on the first row that also have a label in
  // the field dictionary, in the order the API returned them.
  const itemKeys = Object.keys(sorted[0] ?? {}).filter((k) => !NON_ITEM_KEYS.has(k) && (fieldDict.vi[k] || fieldDict.en[k]));

  const items: FinancialLineItem[] = itemKeys.map((key) => ({
    id: key,
    name: fieldDict.vi[key] ?? fieldDict.en[key] ?? key,
    nameEn: fieldDict.en[key] ?? key,
    // No per-field unit code is exposed by the metrics endpoint — every
    // KQKD/CDKT/LCTT line item is a monetary figure, so this defaults to
    // "Tỷ VNĐ" (billion VND), matching how KBS/VNDirect's own statement
    // rows are labeled elsewhere in this app.
    unit: "Tỷ VNĐ",
    levels: 0,
    values: sorted.map((row) => toNumber(row[key])),
  }));

  if (items.length === 0) {
    throw Object.assign(
      new Error(`VCI trả về ${sorted.length} kỳ cho ${symbol} (${reportType}) nhưng không khớp được tên chỉ tiêu nào.`),
      { status: 502 }
    );
  }

  const hasAnyValue = items.some((it) => it.values.some((v) => v !== null));
  if (!hasAnyValue) {
    throw Object.assign(
      new Error(`VCI trả về ${items.length} chỉ tiêu cho ${symbol} (${reportType}) nhưng toàn bộ giá trị rỗng.`),
      { status: 502 }
    );
  }

  return { periods, items };
}

export async function fetchVciReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType
): Promise<FinancialReport> {
  if (reportType === "CSTC") return fetchVciRatioReport(symbol, periodType);
  return fetchVciStatementReport(symbol, reportType, periodType);
}
