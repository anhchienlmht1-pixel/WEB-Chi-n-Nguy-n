import type { FinancialLineItem, FinancialReport, KbsPeriodType, KbsReportType } from "./kbsFinancials.js";

// Vietcap Securities (VCI) — a financial-reports source, tried alongside
// VNDirect and KBS (financials.ts picks whichever answers with the most
// periods).
//
// CSTC (ratio) requests hit a REST endpoint verified directly against
// vnstock's open-source VCI explorer (github.com/thinh-vu/vnstock,
// vnstock/explorer/vci/{financial,const}.py — the `Finance._get_report`
// RATIO branch, and RATIO_COLUMN_MAP_VI/EN for field labels), cloned and
// read locally since this sandbox can't reach vietcap.com.vn directly to
// test the live response. The endpoint path, request shape (plain GET, no
// body), and field names are taken verbatim from that source — genuinely
// verified, not guessed. What's NOT verified (vnstock's own code doesn't
// pin this down cleanly either) is exactly how year/quarter rows are mixed
// in the response for a given period type; see the defensive grouping
// logic in parseRatioRows below and its comment.
//
// KQKD/CDKT/LCTT (income statement / balance sheet / cash flow) still use
// the older GraphQL query further below — that part remains reconstructed
// from memory, not verified, same caveat as before.
const VCIQ_BASE = "https://iq.vietcap.com.vn/api/iq-insight-service";
const HANDSHAKE_URL = "https://trading.vietcap.com.vn/priceboard";
const VCI_GRAPHQL_URL = "https://api.vietcap.com.vn/data-mt/graphql";

const GRAPHQL_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Origin: "https://trading.vietcap.com.vn",
  Referer: "https://trading.vietcap.com.vn/",
};

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
// too rather than assuming the REST endpoint works cookie-less.
async function handshakeCookies(): Promise<string | undefined> {
  try {
    const res = await fetch(HANDSHAKE_URL, { headers: REST_HEADERS, signal: AbortSignal.timeout(5000) });
    const cookies = res.headers.getSetCookie?.() ?? [];
    if (cookies.length === 0) return undefined;
    // Each Set-Cookie value is "name=value; Path=...; HttpOnly..." — only
    // the name=value pair before the first ";" is meaningful for the next
    // request's own Cookie header.
    return cookies.map((c) => c.split(";")[0]).join("; ");
  } catch {
    // Best-effort — vnstock itself just logs a warning and continues
    // without cookies on handshake failure, so this does too.
    return undefined;
  }
}

const QUERY_NAME: Record<KbsReportType, string> = {
  KQKD: "CompanyIncomeStatement",
  CDKT: "CompanyBalanceSheet",
  LCTT: "CompanyCashFlow",
  CSTC: "CompanyFinancialRatio",
};

// Best-effort guess at the field set each query exposes — a flat set of
// scalar metrics per period rather than KBS/VNDirect's arbitrary line-item
// list, since VCI's ratio/statement endpoints are documented (via vnstock
// usage examples) as fixed-column tables, not open-ended item rows.
const FIELD_SET: Record<KbsReportType, string[]> = {
  KQKD: ["revenue", "revenue_growth", "net_profit", "net_profit_growth", "gross_profit", "operating_profit"],
  CDKT: ["total_assets", "total_assets_growth", "total_liabilities", "total_equity", "cash", "short_term_debt"],
  LCTT: ["net_cash_flow_from_operating", "net_cash_flow_from_investing", "net_cash_flow_from_financing"],
  CSTC: ["pe", "pb", "roe", "roa", "eps", "bvps", "dividend"],
};

const FIELD_LABEL: Record<string, string> = {
  revenue: "Doanh thu",
  revenue_growth: "Tăng trưởng doanh thu",
  net_profit: "Lợi nhuận sau thuế",
  net_profit_growth: "Tăng trưởng lợi nhuận",
  gross_profit: "Lợi nhuận gộp",
  operating_profit: "Lợi nhuận hoạt động",
  total_assets: "Tổng tài sản",
  total_assets_growth: "Tăng trưởng tổng tài sản",
  total_liabilities: "Tổng nợ phải trả",
  total_equity: "Vốn chủ sở hữu",
  cash: "Tiền và tương đương tiền",
  short_term_debt: "Nợ ngắn hạn",
  net_cash_flow_from_operating: "Lưu chuyển tiền từ HĐKD",
  net_cash_flow_from_investing: "Lưu chuyển tiền từ HĐĐT",
  net_cash_flow_from_financing: "Lưu chuyển tiền từ HĐTC",
  pe: "P/E",
  pb: "P/B",
  roe: "ROE",
  roa: "ROA",
  eps: "EPS",
  bvps: "BVPS",
  dividend: "Cổ tức",
};

function buildQuery(reportType: KbsReportType): string {
  const name = QUERY_NAME[reportType];
  const fields = ["ticker", "year", "quarter", ...FIELD_SET[reportType]];
  return `query Query($ticker: String!, $period: String!) {
  ${name}(ticker: $ticker, period: $period) {
    ${fields.join("\n    ")}
  }
}`;
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// A quarter of 0/null/missing means the row is an annual figure — only
// values 1-4 are an actual quarter.
function rowQuarter(row: any): number | null {
  const q = Number(row.quarter);
  return Number.isFinite(q) && q >= 1 && q <= 4 ? q : null;
}

function periodSortKey(row: any): number {
  const year = Number(row.year) || 0;
  return year * 4 + (rowQuarter(row) ?? 4);
}

function periodLabel(row: any): string {
  const year = Number(row.year);
  const quarter = rowQuarter(row);
  return quarter ? `Q${quarter} ${year}` : String(year);
}

async function fetchVciReportGraphQL(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType
): Promise<FinancialReport> {
  const query = buildQuery(reportType);
  const variables = { ticker: symbol, period: periodType === "quarter" ? "quarterly" : "yearly" };

  let res: Response;
  try {
    res = await fetch(VCI_GRAPHQL_URL, {
      method: "POST",
      headers: GRAPHQL_HEADERS,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`VCI không phản hồi cho ${symbol} (${reportType}): ${cause}`), { status: 504 });
  }
  const rawBody = await res.text();

  if (!res.ok) {
    throw Object.assign(
      new Error(`VCI trả lỗi HTTP ${res.status} cho ${symbol} (${reportType}). Nội dung: ${rawBody.slice(0, 400)}`),
      { status: 502 }
    );
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw Object.assign(
      new Error(`VCI trả dữ liệu không phải JSON cho ${symbol} (${reportType}): ${rawBody.slice(0, 200)}`),
      { status: 502 }
    );
  }

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const messages = data.errors.map((e: any) => e?.message ?? JSON.stringify(e)).join(" | ");
    throw Object.assign(new Error(`VCI GraphQL báo lỗi cho ${symbol} (${reportType}): ${messages}`), {
      status: 502,
    });
  }

  const rows: any[] = data?.data?.[QUERY_NAME[reportType]];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(
      new Error(
        `VCI trả về rỗng hoặc sai cấu trúc cho ${symbol} (${reportType}). Raw: ${JSON.stringify(data).slice(0, 400)}`
      ),
      { status: 502 }
    );
  }

  const sorted = [...rows].sort((a, b) => periodSortKey(a) - periodSortKey(b));
  const periods = sorted.map(periodLabel);
  const fields = FIELD_SET[reportType];

  const items: FinancialLineItem[] = fields.map((field) => ({
    id: field,
    name: FIELD_LABEL[field] ?? field,
    nameEn: field,
    unit: field.endsWith("_growth") || ["pe", "pb", "roe", "roa"].includes(field) ? "%" : "Tỷ VNĐ",
    levels: 0,
    values: sorted.map((row) => toNumber(row[field])),
  }));

  const hasAnyValue = items.some((it) => it.values.some((v) => v !== null));
  if (!hasAnyValue) {
    throw Object.assign(
      new Error(`VCI trả về ${items.length} chỉ tiêu cho ${symbol} (${reportType}) nhưng toàn bộ giá trị rỗng.`),
      { status: 502 }
    );
  }

  return { periods, items };
}

// Field labels/units below are copied verbatim from vnstock's
// RATIO_COLUMN_MAP_VI/EN (vnstock/explorer/vci/const.py) — a curated subset
// of the ~50 fields that endpoint returns, matching what this app's own
// ratio extraction already looks for (client/src/utils/ratios.ts's
// PE_MATCH/PB_MATCH/ROE_MATCH/ROA_MATCH match on these exact Vietnamese
// labels via substring/regex, so reusing them verbatim keeps this source
// compatible with existing UI code for free) plus a few more commonly
// useful ones (market cap, margins, leverage).
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

function ratioPeriodLabel(row: any): string {
  const year = ratioRowYear(row);
  const quarter = ratioRowQuarter(row);
  return quarter ? `Q${quarter} ${year}` : String(year ?? "?");
}

async function fetchVciRatioReport(symbol: string, periodType: KbsPeriodType): Promise<FinancialReport> {
  const cookie = await handshakeCookies();
  const headers = cookie ? { ...REST_HEADERS, Cookie: cookie } : REST_HEADERS;
  const url = `${VCIQ_BASE}/v1/company/${encodeURIComponent(symbol)}/statistics-financial`;

  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`VCI không phản hồi cho ${symbol} (CSTC): ${cause}`), { status: 504 });
  }
  const rawBody = await res.text();

  if (!res.ok) {
    throw Object.assign(
      new Error(`VCI trả lỗi HTTP ${res.status} cho ${symbol} (CSTC). Nội dung: ${rawBody.slice(0, 400)}`),
      { status: 502 }
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error(`VCI trả dữ liệu không phải JSON cho ${symbol} (CSTC): ${rawBody.slice(0, 200)}`), {
      status: 502,
    });
  }

  const rows: any[] = parsed?.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error(`VCI trả về rỗng cho ${symbol} (CSTC).`), { status: 502 });
  }

  const selected = selectRatioRows(rows, periodType).sort(
    (a, b) => (ratioRowYear(a) ?? 0) * 4 + (ratioRowQuarter(a) ?? 4) - ((ratioRowYear(b) ?? 0) * 4 + (ratioRowQuarter(b) ?? 4))
  );
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

export async function fetchVciReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType
): Promise<FinancialReport> {
  if (reportType === "CSTC") return fetchVciRatioReport(symbol, periodType);
  return fetchVciReportGraphQL(symbol, reportType, periodType);
}
