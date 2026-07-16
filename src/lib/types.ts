export type Exchange = "HOSE" | "HNX" | "UPCOM";

export interface StockMeta {
  symbol: string;
  name: string;
  exchange: Exchange;
  industry: string;
}

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  refPrice: number;
  ceilingPrice: number;
  floorPrice: number;
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  volume: number;
  updatedAt: number;
}

// One reporting period's worth of financial ratios, keyed by Vietcap's
// field codes (roe, roa, npl, casaRatio, ...). Not every symbol has every
// field — banks have CASA/NIM/NPL, non-banks don't — so this stays a loose
// bag of whatever the source actually returned for that period.
export interface RatioPoint {
  period: string; // e.g. "Q1 2026" or "2025"
  periodType: "quarter" | "year";
  values: Record<string, number | null>;
}

export type IndexCode = "VNINDEX" | "HNXINDEX" | "UPCOMINDEX";

export interface IndexQuote {
  code: IndexCode;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volume: number;
  history: { time: number; value: number }[];
}
