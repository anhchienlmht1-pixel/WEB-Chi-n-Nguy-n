import axios from "axios";
import type {
  DailyDigest,
  FinancialPeriodType,
  FinancialReport,
  FinancialReportType,
  HistoryPoint,
  HistoryRange,
  NewsItem,
  Quote,
  SearchResult,
  TopExchange,
  TopTradedItem,
} from "../types";

const api = axios.create({ baseURL: "/api", timeout: 30000 });

// Prefer the server's JSON error message ({"error": "..."}) over axios's
// generic "Request failed with status code 500" so users see what's wrong.
// Normally axios auto-parses a JSON response into `.data` as an object,
// but if the response's Content-Type ever isn't exactly application/json
// (seen on Vercel's serverless runtime for reasons not reproducible in
// local dev), `.data` arrives as a raw string instead — handle that case
// too instead of silently falling back to the generic message.
api.interceptors.response.use(undefined, (error) => {
  let serverMessage: unknown = error?.response?.data?.error;
  if (serverMessage === undefined && typeof error?.response?.data === "string") {
    try {
      serverMessage = JSON.parse(error.response.data)?.error;
    } catch {
      // Not JSON after all — fall through and keep axios's default message.
    }
  }
  if (typeof serverMessage === "string" && serverMessage) {
    error.message = serverMessage;
  }
  return Promise.reject(error);
});

export async function fetchMarketOverview(): Promise<{ provider: string; quotes: Quote[] }> {
  const { data } = await api.get("/market/overview");
  return data;
}

// One auto-generated market note per day — server picks the single most
// notable topic (spotlight mover / leading sector / liquidity spike /
// overall breadth) from the day's quotes. See server/src/digest/marketDigest.ts.
export async function fetchDailyDigest(): Promise<DailyDigest> {
  const { data } = await api.get("/market/daily-digest");
  return data;
}

export async function fetchQuote(symbol: string, preferSource?: string): Promise<Quote> {
  const { data } = await api.get(`/quote/${encodeURIComponent(symbol)}`, {
    params: preferSource ? { preferSource } : undefined,
  });
  return data;
}

export async function fetchHistory(
  symbol: string,
  range: HistoryRange,
  preferSource?: string
): Promise<{ symbol: string; range: HistoryRange; points: HistoryPoint[]; source?: string }> {
  const { data } = await api.get(`/history/${encodeURIComponent(symbol)}`, {
    params: preferSource ? { range, preferSource } : { range },
  });
  return data;
}

export async function fetchTopTraded(
  exchange: TopExchange
): Promise<{ provider: string; exchange: TopExchange; items: TopTradedItem[] }> {
  const { data } = await api.get("/market/top", { params: { exchange } });
  return data;
}

export async function fetchFinancials(
  symbol: string,
  type: FinancialReportType,
  periodType: FinancialPeriodType
): Promise<FinancialReport> {
  const { data } = await api.get(`/financials/${encodeURIComponent(symbol)}`, {
    params: { type, periodType },
  });
  return data;
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await api.get("/search", { params: { q: query } });
  return data.results;
}

export async function fetchNewsForSymbol(
  symbol: string,
  limit = 10
): Promise<{ symbol: string; items: NewsItem[]; poolSize: number; usedFeed: string }> {
  const { data } = await api.get(`/news/${encodeURIComponent(symbol)}`, { params: { limit } });
  return data;
}

export interface StockOutlookRecord {
  symbol: string;
  updatedAt: string;
  outlookText: string;
  recommendations: { broker: string; price: string }[];
}

export async function fetchInvestmentOutlook(gid?: string): Promise<StockOutlookRecord> {
  const { data } = await api.get("/investment-outlook", { params: gid ? { gid } : undefined });
  return data;
}

export interface PbHistoryTable {
  symbols: string[];
  rows: { date: string; values: (number | null)[] }[];
}

export async function fetchBankPbHistory(): Promise<PbHistoryTable> {
  const { data } = await api.get("/bank-pb-history");
  return data;
}

export async function fetchSecuritiesPbHistory(): Promise<PbHistoryTable> {
  const { data } = await api.get("/securities-pb-history");
  return data;
}

export async function fetchRealEstatePbHistory(): Promise<PbHistoryTable> {
  const { data } = await api.get("/realestate-pb-history");
  return data;
}

export interface CompanyOfficer {
  fromDate: string | null;
  position: string | null;
  name: string | null;
}

export interface CompanyShareholder {
  name: string | null;
  updateDate: string | null;
  sharesOwned: number | null;
  ownershipPercent: number | null;
}

export interface CompanyProfile {
  symbol: string;
  businessModel: string | null;
  foundedDate: string | null;
  charterCapital: number | null;
  numberOfEmployees: number | null;
  listingDate: string | null;
  parValue: number | null;
  exchange: string | null;
  ceoName: string | null;
  ceoPosition: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  history: string | null;
  outstandingShares: number | null;
  officers: CompanyOfficer[];
  shareholders: CompanyShareholder[];
  // Which live provider this profile actually came from (KBS tried first,
  // VCI as fallback) — surfaced in the UI so the source is always disclosed.
  source: "KBS" | "VCI";
}

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile> {
  const { data } = await api.get(`/company-profile/${encodeURIComponent(symbol)}`);
  return data;
}

export interface TrendBuySignal {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  changePercent: number;
  // ISO date the current uninterrupted buy streak started.
  signalSince: string;
}

// Same trend-following combo as a chart's own Mua/Bán markers (SMA20 >
// SMA50, ADX(14) > 25, Supertrend(10,3) uptrend), scanned across the whole
// stock universe server-side and cached for an hour — see
// server/src/signals/trendScanner.ts.
export async function fetchTrendBuySignals(): Promise<TrendBuySignal[]> {
  const { data } = await api.get("/trend-signals");
  return data.items;
}
