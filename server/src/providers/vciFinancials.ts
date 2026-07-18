import type { FinancialLineItem, FinancialReport, KbsPeriodType, KbsReportType } from "./kbsFinancials.js";

// Vietcap Securities (VCI) — a third financial-reports source, tried
// alongside VNDirect and KBS (financials.ts picks whichever answers with
// the most periods). Unlike VNDirect/KBS's plain REST+JSON endpoints (where
// an unknown shape can be parsed defensively — read whatever keys are
// there), VCI's public API is GraphQL, which requires the exact field names
// the schema exposes. This is reconstructed from memory of vnstock's VCI
// explorer, NOT verified against a live schema (this sandbox can't reach
// any external host) — genuinely more likely to be wrong than the other two
// sources were, since a GraphQL field-name mismatch fails outright rather
// than just parsing to something empty. If it 400s with a "Cannot query
// field ..." message, that error is the fix: it names the real field.
const VCI_GRAPHQL_URL = "https://api.vietcap.com.vn/data-mt/graphql";

const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Origin: "https://trading.vietcap.com.vn",
  Referer: "https://trading.vietcap.com.vn/",
};

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
  KQKD: ["revenue", "revenueGrowth", "netProfit", "netProfitGrowth", "grossProfit", "operatingProfit"],
  CDKT: ["totalAssets", "totalAssetsGrowth", "totalLiabilities", "totalEquity", "cash", "shortTermDebt"],
  LCTT: ["netCashFlowFromOperating", "netCashFlowFromInvesting", "netCashFlowFromFinancing"],
  CSTC: ["pe", "pb", "roe", "roa", "eps", "bvps", "dividend"],
};

const FIELD_LABEL: Record<string, string> = {
  revenue: "Doanh thu",
  revenueGrowth: "Tăng trưởng doanh thu",
  netProfit: "Lợi nhuận sau thuế",
  netProfitGrowth: "Tăng trưởng lợi nhuận",
  grossProfit: "Lợi nhuận gộp",
  operatingProfit: "Lợi nhuận hoạt động",
  totalAssets: "Tổng tài sản",
  totalAssetsGrowth: "Tăng trưởng tổng tài sản",
  totalLiabilities: "Tổng nợ phải trả",
  totalEquity: "Vốn chủ sở hữu",
  cash: "Tiền và tương đương tiền",
  shortTermDebt: "Nợ ngắn hạn",
  netCashFlowFromOperating: "Lưu chuyển tiền từ HĐKD",
  netCashFlowFromInvesting: "Lưu chuyển tiền từ HĐĐT",
  netCashFlowFromFinancing: "Lưu chuyển tiền từ HĐTC",
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
  const fields = ["ticker", "yearReport", "lengthReport", ...FIELD_SET[reportType]];
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

function periodLabel(yearReport: unknown, lengthReport: unknown): string {
  const year = Number(yearReport);
  const length = Number(lengthReport);
  // vnstock's VCI convention: lengthReport 5 means "full year", 1-4 mean quarters.
  if (Number.isFinite(length) && length >= 1 && length <= 4) return `Q${length} ${year}`;
  return String(year);
}

export async function fetchVciReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType
): Promise<FinancialReport> {
  const query = buildQuery(reportType);
  const variables = { ticker: symbol, period: periodType === "quarter" ? "quarterly" : "yearly" };

  const res = await fetch(VCI_GRAPHQL_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  });
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
    throw Object.assign(
      new Error(`VCI GraphQL báo lỗi cho ${symbol} (${reportType}): ${messages}`),
      { status: 502 }
    );
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

  const sorted = [...rows].sort((a, b) => {
    const ay = Number(a.yearReport) * 4 + (Number(a.lengthReport) <= 4 ? Number(a.lengthReport) : 4);
    const by = Number(b.yearReport) * 4 + (Number(b.lengthReport) <= 4 ? Number(b.lengthReport) : 4);
    return ay - by;
  });

  const periods = sorted.map((row) => periodLabel(row.yearReport, row.lengthReport));
  const fields = FIELD_SET[reportType];

  const items: FinancialLineItem[] = fields.map((field, i) => ({
    id: field,
    name: FIELD_LABEL[field] ?? field,
    nameEn: field,
    unit: field.toLowerCase().includes("growth") || ["pe", "pb", "roe", "roa"].includes(field) ? "%" : "Tỷ VNĐ",
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
