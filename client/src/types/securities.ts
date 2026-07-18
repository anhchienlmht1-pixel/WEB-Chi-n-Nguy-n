// Types for the "Cơ bản" (Fundamentals) section for securities companies
// — sourced from a static export of the securities-industry Excel model
// (see scripts/export-securities-data.py). Covers the 16 listed VN
// securities firms only; every other stock has no data here. Mirrors
// bank.ts's shape (same "Cơ bản" architecture, different industry).

export interface SecuritiesMeta {
  symbol: string;
  name: string;
  exchange: string;
}

export interface SecuritiesMetricSeries {
  propAssets: (number | null)[];
  propAssetsGrowth: (number | null)[];
  bvps: (number | null)[];
  assetsToEquity: (number | null)[];
  liabToEquity: (number | null)[];
  roa: (number | null)[];
  roe: (number | null)[];
  grossMargin: (number | null)[];
  pretaxMargin: (number | null)[];
  netMargin: (number | null)[];
  revenueGrowth: (number | null)[];
  pretaxProfitGrowth: (number | null)[];
  netProfitGrowth: (number | null)[];
  epsBasic: (number | null)[];
  epsDiluted: (number | null)[];
  sharesOutstanding: (number | null)[];
  brokerageMargin: (number | null)[];
  brokerageRevenueShare: (number | null)[];
  brokerageTakeRate: (number | null)[];
  stockTakeRate: (number | null)[];
  marginBalance: (number | null)[];
  marginGrowth: (number | null)[];
  propToTotalAssets: (number | null)[];
  propToEquity: (number | null)[];
  propRevenue: (number | null)[];
  propProfit: (number | null)[];
  propRevenueShare: (number | null)[];
  propProfitShare: (number | null)[];
  propMargin: (number | null)[];
  marginRate: (number | null)[];
  fundingCost: (number | null)[];
  marginSpread: (number | null)[];
  marginUtilization: (number | null)[];
}

export type SecuritiesMetricKey = keyof SecuritiesMetricSeries;

export interface SecuritiesPeriodData {
  periods: string[];
  metrics: SecuritiesMetricSeries;
}

export interface SecuritiesCompanyData extends SecuritiesMeta {
  quarter: SecuritiesPeriodData;
  year: SecuritiesPeriodData;
}

export interface SecuritiesOverviewRow extends SecuritiesMeta {
  period: string;
  propAssets: number | null;
  propAssetsGrowth: number | null;
  bvps: number | null;
  assetsToEquity: number | null;
  liabToEquity: number | null;
  roa: number | null;
  roe: number | null;
  grossMargin: number | null;
  pretaxMargin: number | null;
  netMargin: number | null;
  revenueGrowth: number | null;
  pretaxProfitGrowth: number | null;
  netProfitGrowth: number | null;
  epsBasic: number | null;
  epsDiluted: number | null;
  sharesOutstanding: number | null;
  brokerageMargin: number | null;
  brokerageRevenueShare: number | null;
  brokerageTakeRate: number | null;
  stockTakeRate: number | null;
  marginBalance: number | null;
  marginGrowth: number | null;
  propToTotalAssets: number | null;
  propToEquity: number | null;
  propRevenue: number | null;
  propProfit: number | null;
  propRevenueShare: number | null;
  propProfitShare: number | null;
  propMargin: number | null;
  marginRate: number | null;
  fundingCost: number | null;
  marginSpread: number | null;
  marginUtilization: number | null;
}

export interface SecuritiesOverview {
  period: string | null;
  companies: SecuritiesOverviewRow[];
}

export interface SecuritiesStatementItem {
  row: number;
  name: string;
  quarter: (number | null)[];
  year: (number | null)[];
}

export interface SecuritiesStatement {
  symbol: string;
  quarterPeriods: string[];
  yearPeriods: string[];
  items: SecuritiesStatementItem[];
}
