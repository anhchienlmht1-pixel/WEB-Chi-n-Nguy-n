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
  /** Foreign-investor trading for the session, when the provider exposes it. */
  foreignBuyVolume?: number;
  foreignSellVolume?: number;
  foreignOwnershipPercent?: number;
  foreignRoom?: number;
}

export interface HistoryPoint {
  time: string; // ISO date or datetime
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type HistoryRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export type TopExchange = "ALL" | "HOSE" | "HNX" | "UPCOM";

export interface TopTradedItem {
  symbol: string;
  exchange: string;
  name?: string;
  price?: number;
  changePercent?: number;
  volume?: number;
  /** Trading value in VND */
  value?: number;
}

export interface StockProvider {
  readonly id: string;
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]>;
  search(query: string): Promise<SearchResult[]>;
  getMarketOverview(): Promise<Quote[]>;
  /** Top 10 most-traded stocks; optional — routes fall back to overview data. */
  getTopTraded?(exchange: TopExchange): Promise<TopTradedItem[]>;
}
