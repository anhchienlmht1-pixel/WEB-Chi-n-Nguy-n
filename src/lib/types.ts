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

// A single financial-statement/ratio line item from KB Securities (KBS),
// item-based: one row per line, one value per reporting period.
export interface FinancialLineItem {
  id: string;
  name: string; // Vietnamese
  nameEn: string;
  unit: string;
  levels: number;
  values: (number | null)[]; // aligned with FinancialReport.periods
}

export interface FinancialReport {
  periods: string[]; // e.g. "Q1 2025" or "2025", oldest first
  items: FinancialLineItem[];
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
