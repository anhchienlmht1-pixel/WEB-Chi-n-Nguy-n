// Types for the "Cơ bản" (Fundamentals) section — sourced from a static
// export of the user's own hand-maintained banking-sector Excel model, not
// a live API (see scripts/export-bank-data.py). Covers the 27 listed VN
// banks only; every other stock has no data here.

export interface BankMeta {
  symbol: string;
  name: string;
  group: string;
  exchange: string;
}

export interface BankMetricSeries {
  totalAssets: (number | null)[];
  loans: (number | null)[];
  deposits: (number | null)[];
  equity: (number | null)[];
  netProfit: (number | null)[];
  nii: (number | null)[];
  toi: (number | null)[];
  operatingExpense: (number | null)[];
  casa: (number | null)[];
  ldr: (number | null)[];
  llr: (number | null)[];
  cir: (number | null)[];
  npl: (number | null)[];
  roe: (number | null)[];
  roa: (number | null)[];
  roe4q: (number | null)[];
  roa4q: (number | null)[];
  nim: (number | null)[];
  yoea: (number | null)[];
  cof: (number | null)[];
  creditGrowthQoQ: (number | null)[];
  depositGrowthQoQ: (number | null)[];
  car: (number | null)[];
}

export type BankMetricKey = keyof BankMetricSeries;

export interface BankPeriodData {
  periods: string[];
  metrics: BankMetricSeries;
}

export interface BankData extends BankMeta {
  quarter: BankPeriodData;
  year: BankPeriodData;
}

export interface BankOverviewRow extends BankMeta {
  period: string;
  totalAssets: number | null;
  loans: number | null;
  deposits: number | null;
  equity: number | null;
  netProfit: number | null;
  nii: number | null;
  toi: number | null;
  operatingExpense: number | null;
  casa: number | null;
  ldr: number | null;
  llr: number | null;
  cir: number | null;
  npl: number | null;
  roe: number | null;
  roa: number | null;
  roe4q: number | null;
  roa4q: number | null;
  nim: number | null;
  yoea: number | null;
  cof: number | null;
  creditGrowthQoQ: number | null;
  depositGrowthQoQ: number | null;
  car: number | null;
}

export interface BankOverview {
  period: string | null;
  banks: BankOverviewRow[];
}

export interface BankStatementItem {
  row: number;
  name: string;
  quarter: (number | null)[];
  year: (number | null)[];
}

export interface BankStatement {
  symbol: string;
  quarterPeriods: string[];
  yearPeriods: string[];
  items: BankStatementItem[];
}
