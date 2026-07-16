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
  time: string; // ISO date or datetime
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

export interface StockProvider {
  readonly id: string;
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]>;
  search(query: string): Promise<SearchResult[]>;
  getMarketOverview(): Promise<Quote[]>;
}
