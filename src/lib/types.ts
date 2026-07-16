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
