export interface Quote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  marketCap?: number;
  updatedAt: string;
}

export interface HistoryPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type HistoryRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}
