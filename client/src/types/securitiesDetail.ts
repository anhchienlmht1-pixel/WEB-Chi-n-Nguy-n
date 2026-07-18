// Types for the "Chi tiết mã chứng khoán" dashboard — sourced from
// scripts/export-securities-detail.py. Series are a flat map (not
// individually typed, ~60 of them) since the chart catalog
// (utils/securitiesDetailCharts.ts) is what documents each id; mirrors
// bankDetail.ts's shape.
export interface SecuritiesDetailPeriodData {
  periods: string[];
  industry: Record<string, (number | null)[]>;
  company: Record<string, (number | null)[]>;
}

export interface SecuritiesDetail {
  symbol: string;
  quarter: SecuritiesDetailPeriodData;
  year: SecuritiesDetailPeriodData;
}
