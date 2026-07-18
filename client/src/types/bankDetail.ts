// Types for the "Chi tiết mã ngân hàng" dashboard — a much deeper,
// per-bank replica of the source Excel's own "Chi tiết" sheet (28 chart
// panels), sourced statically from scripts/export-bank-detail.py. Unlike
// bank.ts's 14-core-ratio "Cơ bản" section, series here are a flat map
// (not individually typed) since there are ~80 of them; SERIES_META in
// utils/bankDetailCharts.ts documents what each id means.
export interface BankDetail {
  symbol: string;
  periods: string[];
  industry: Record<string, (number | null)[]>;
  bank: Record<string, (number | null)[]>;
}
