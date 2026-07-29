import type { BankData, BankMeta, BankMetricKey, BankStatement } from "../types/bank";
import type { BankDetail } from "../types/bankDetail";

// The "Cơ bản" (Fundamentals) section only has data for symbols listed
// here — sourced from the user's own hand-maintained Excel model (see
// scripts/export-bank-data.py), not a live API. Cleared at the user's
// request (the exported JSON files under client/public/data/banks/ were
// deleted too) so this can be set up fresh; the bank-fundamentals UI
// already hides itself for any symbol not in this set.
export const BANK_SYMBOLS = new Set<string>([]);

export function isBankSymbol(symbol: string): boolean {
  return BANK_SYMBOLS.has(symbol.toUpperCase());
}

// Static JSON assets under client/public/data/banks/ — plain fetch, not the
// axios `/api` instance, since these are build-time-exported files rather
// than live API routes.
async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Không tải được ${path} (HTTP ${res.status})`);
  return res.json();
}

export function fetchBankMeta(): Promise<{ banks: BankMeta[] }> {
  return fetchJson("/data/banks/meta.json");
}

export function fetchBankData(symbol: string): Promise<BankData> {
  return fetchJson(`/data/banks/${symbol.toUpperCase()}.json`);
}

export function fetchBankStatement(symbol: string): Promise<BankStatement> {
  return fetchJson(`/data/banks/statements/${symbol.toUpperCase()}.json`);
}

export function fetchBankDetail(symbol: string): Promise<BankDetail> {
  return fetchJson(`/data/banks/detail/${symbol.toUpperCase()}.json`);
}

// BANK_SYMBOLS order matches meta.json / the source Excel's own bank list
// — used as the default sort order for the "Chi tiết mã ngân hàng" symbol
// picker.
export const BANK_SYMBOL_LIST = Array.from(BANK_SYMBOLS);

// The 14 core ratios, in the order the source Excel's own "Chi tiết"
// dashboard sheet lists them.
export const CORE_METRIC_KEYS: BankMetricKey[] = [
  "casa", "loans", "deposits", "roe4q", "roe", "roa4q", "roa",
  "nim", "ldr", "llr", "cir", "npl", "yoea", "cof",
];

export type MetricFormat = "money" | "percent";

export const METRIC_META: Record<BankMetricKey, { label: string; format: MetricFormat }> = {
  totalAssets: { label: "Tổng tài sản", format: "money" },
  loans: { label: "Cho vay khách hàng", format: "money" },
  deposits: { label: "Tiền gửi khách hàng", format: "money" },
  equity: { label: "Vốn chủ sở hữu", format: "money" },
  netProfit: { label: "Lợi nhuận sau thuế", format: "money" },
  nii: { label: "Thu nhập lãi thuần", format: "money" },
  toi: { label: "Tổng thu nhập hoạt động", format: "money" },
  operatingExpense: { label: "Chi phí hoạt động", format: "money" },
  casa: { label: "CASA", format: "percent" },
  ldr: { label: "LDR", format: "percent" },
  llr: { label: "LLR", format: "percent" },
  cir: { label: "CIR", format: "percent" },
  npl: { label: "NPL", format: "percent" },
  roe: { label: "ROE", format: "percent" },
  roa: { label: "ROA", format: "percent" },
  roe4q: { label: "ROE (4 quý gần nhất)", format: "percent" },
  roa4q: { label: "ROA (4 quý gần nhất)", format: "percent" },
  nim: { label: "NIM", format: "percent" },
  yoea: { label: "YOEA", format: "percent" },
  cof: { label: "COF", format: "percent" },
  creditGrowthQoQ: { label: "Tăng trưởng tín dụng", format: "percent" },
  depositGrowthQoQ: { label: "Tăng trưởng huy động", format: "percent" },
  car: { label: "CAR", format: "percent" },
};

export function formatMetricValue(value: number | null, format: MetricFormat): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (format === "percent") return `${(value * 100).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tỷ`;
}

// Relative change for a ratio already stored as a fraction (e.g. ROE
// 4.1% -> 4.3%) reads as percentage-point delta, not a relative %, since a
// relative change of a small ratio is misleading/noisy.
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
