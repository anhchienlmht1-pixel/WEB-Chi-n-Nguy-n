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
  /** Absolute count of shares currently held by foreign investors. */
  foreignSharesOwned?: number;
  foreignRoom?: number;
  /** foreignRoom as a % of total shares outstanding. */
  foreignRoomPercent?: number;
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

export interface MoneyFlowRecord {
  symbol: string;
  primaryLabel: string | null;
  primaryValue: string | null;
  metrics: Record<string, string>;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source: string;
}

export type DigestTopic = "spotlight" | "sector" | "liquidity" | "breadth";

export interface DigestHighlight {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
}

export interface DigestStockRef {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  changePercent: number;
  volume: number;
}

export interface DigestHeroStat {
  value: string;
  label: string;
  tone: "up" | "down" | "neutral";
}

export interface DigestMarketPulse {
  advancers: number;
  decliners: number;
  unchanged: number;
  total: number;
  avgChange: number;
  median: number;
}

export interface CompanySnapshot {
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  businessModel: string | null;
  charterCapitalText: string | null;
  listingDate: string | null;
  valuation: { pe: number | null; pb: number | null; roe: number | null };
}

export type TrendStance = "MUA" | "DUNG_NGOAI";

export interface TrendAction {
  symbol: string;
  stance: TrendStance;
  stanceLabel: string;
  signalSince: string | null;
  reasoning: string;
}

export interface DailyDigest {
  date: string;
  provider: string;
  topic: DigestTopic;
  topicLabel: string;
  title: string;
  hookLines: [string, string];
  paragraphs: string[];
  highlights: DigestHighlight[];
  heroStat: DigestHeroStat;
  marketPulse: DigestMarketPulse;
  relatedStocks: DigestStockRef[];
  primarySymbol: string | null;
  company: CompanySnapshot | null;
  action: TrendAction | null;
}
