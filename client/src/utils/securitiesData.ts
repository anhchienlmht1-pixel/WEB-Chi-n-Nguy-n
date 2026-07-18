import type {
  SecuritiesCompanyData,
  SecuritiesMeta,
  SecuritiesMetricKey,
  SecuritiesOverview,
  SecuritiesStatement,
} from "../types/securities";
import type { SecuritiesDetail } from "../types/securitiesDetail";

// The "Chứng khoán" (Securities) section only has data for these 16
// listed securities companies — exported once from a hand-maintained
// Excel model (see scripts/export-securities-data.py /
// export-securities-detail.py), not a live API.
export const SECURITIES_SYMBOLS = new Set([
  "SSI", "VND", "HCM", "VCI", "VIX", "MBS", "FTS", "SHS",
  "BSI", "DSE", "CTS", "VDS", "ORS", "VCK", "VPX", "TCX",
]);

export function isSecuritiesSymbol(symbol: string): boolean {
  return SECURITIES_SYMBOLS.has(symbol.toUpperCase());
}

export const SECURITIES_SYMBOL_LIST = Array.from(SECURITIES_SYMBOLS);

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Không tải được ${path} (HTTP ${res.status})`);
  return res.json();
}

export function fetchSecuritiesMeta(): Promise<{ companies: SecuritiesMeta[] }> {
  return fetchJson("/data/securities/meta.json");
}

export function fetchSecuritiesData(symbol: string): Promise<SecuritiesCompanyData> {
  return fetchJson(`/data/securities/${symbol.toUpperCase()}.json`);
}

export function fetchSecuritiesOverview(): Promise<SecuritiesOverview> {
  return fetchJson("/data/securities/overview.json");
}

export function fetchSecuritiesStatement(symbol: string): Promise<SecuritiesStatement> {
  return fetchJson(`/data/securities/statements/${symbol.toUpperCase()}.json`);
}

export function fetchSecuritiesDetail(symbol: string): Promise<SecuritiesDetail> {
  return fetchJson(`/data/securities/detail/${symbol.toUpperCase()}.json`);
}

export const CORE_METRIC_KEYS: SecuritiesMetricKey[] = [
  "roe", "roa", "epsBasic", "bvps",
  "grossMargin", "pretaxMargin", "netMargin", "brokerageMargin",
  "brokerageRevenueShare", "marginRate", "fundingCost", "marginSpread",
  "propProfitShare", "marginBalance",
];

export type MetricFormat = "money" | "percent" | "perShare";

export const METRIC_META: Record<SecuritiesMetricKey, { label: string; format: MetricFormat }> = {
  propAssets: { label: "Tài sản tự doanh", format: "money" },
  propAssetsGrowth: { label: "Tăng trưởng tài sản tự doanh", format: "percent" },
  bvps: { label: "BVPS", format: "perShare" },
  assetsToEquity: { label: "Tổng tài sản / VCSH", format: "percent" },
  liabToEquity: { label: "Nợ phải trả / VCSH", format: "percent" },
  roa: { label: "ROA", format: "percent" },
  roe: { label: "ROE", format: "percent" },
  grossMargin: { label: "Biên lợi nhuận gộp", format: "percent" },
  pretaxMargin: { label: "Biên LNTT", format: "percent" },
  netMargin: { label: "Biên LNST", format: "percent" },
  revenueGrowth: { label: "Tăng trưởng doanh thu", format: "percent" },
  pretaxProfitGrowth: { label: "Tăng trưởng LNTT", format: "percent" },
  netProfitGrowth: { label: "Tăng trưởng LNST", format: "percent" },
  epsBasic: { label: "EPS cơ bản", format: "perShare" },
  epsDiluted: { label: "EPS pha loãng", format: "perShare" },
  sharesOutstanding: { label: "Cổ phiếu lưu hành", format: "money" },
  brokerageMargin: { label: "Biên LN môi giới", format: "percent" },
  brokerageRevenueShare: { label: "Tỷ trọng DT môi giới", format: "percent" },
  brokerageTakeRate: { label: "Take rate môi giới", format: "percent" },
  stockTakeRate: { label: "Take rate cổ phiếu", format: "percent" },
  marginBalance: { label: "Dư nợ margin", format: "money" },
  marginGrowth: { label: "Tăng trưởng margin", format: "percent" },
  propToTotalAssets: { label: "Tự doanh / Tổng tài sản", format: "percent" },
  propToEquity: { label: "Tự doanh / VCSH", format: "percent" },
  propRevenue: { label: "Doanh thu tự doanh", format: "money" },
  propProfit: { label: "Lợi nhuận tự doanh", format: "money" },
  propRevenueShare: { label: "Tỷ trọng DT tự doanh", format: "percent" },
  propProfitShare: { label: "Tỷ trọng LN tự doanh", format: "percent" },
  propMargin: { label: "Biên LN tự doanh", format: "percent" },
  marginRate: { label: "Lãi suất cho vay margin", format: "percent" },
  fundingCost: { label: "Chi phí vốn", format: "percent" },
  marginSpread: { label: "Biên lãi margin", format: "percent" },
  marginUtilization: { label: "Tỷ lệ margin đang cho vay", format: "percent" },
};

export function formatMetricValue(value: number | null, format: MetricFormat): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (format === "percent") return `${(value * 100).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  if (format === "perShare") return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ`;
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ`;
}

export function metricDelta(current: number | null, prior: number | null, format: MetricFormat): string {
  if (current === null || prior === null || !Number.isFinite(current) || !Number.isFinite(prior)) return "—";
  if (format === "percent") {
    const deltaPts = (current - prior) * 100;
    const sign = deltaPts >= 0 ? "+" : "";
    return `${sign}${deltaPts.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} đpt`;
  }
  if (prior === 0) return "—";
  const pct = ((current - prior) / Math.abs(prior)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
}
