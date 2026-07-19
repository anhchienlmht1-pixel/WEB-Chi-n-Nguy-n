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
  /** Which provider answered this request (kbs/vndirect/vnstock) — lets a
   * caller pin a related request (e.g. history for the same symbol) to the
   * same source instead of independently re-resolving the fallback chain. */
  source?: string;
}

export interface HistoryPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type HistoryRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";

export type TopExchange = "ALL" | "HOSE" | "HNX" | "UPCOM";

export interface TopTradedItem {
  symbol: string;
  exchange: string;
  name?: string;
  price?: number;
  changePercent?: number;
  volume?: number;
  value?: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface FinancialLineItem {
  id: string;
  name: string;
  nameEn: string;
  unit: string;
  levels: number;
  values: (number | null)[];
}

export type FinancialSource = "vndirect" | "kbs" | "vci" | "cafef";

export interface FinancialReport {
  periods: string[];
  items: FinancialLineItem[];
  source?: FinancialSource;
  otherSources?: { source: FinancialSource; outcome: string }[];
}

export type FinancialReportType = "KQKD" | "CDKT" | "LCTT" | "CSTC";
export type FinancialPeriodType = "year" | "quarter";

export interface NewsItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source: string;
}
