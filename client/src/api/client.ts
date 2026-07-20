import axios from "axios";
import type {
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
api.interceptors.response.use(undefined, (error) => {
  const serverMessage = error?.response?.data?.error;
  if (typeof serverMessage === "string" && serverMessage) {
    error.message = serverMessage;
  }
  return Promise.reject(error);
});

export async function fetchMarketOverview(): Promise<{ provider: string; quotes: Quote[] }> {
  const { data } = await api.get("/market/overview");
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

export interface BankPbHistoryTable {
  symbols: string[];
  rows: { date: string; values: (number | null)[] }[];
}

export async function fetchBankPbHistory(): Promise<BankPbHistoryTable> {
  const { data } = await api.get("/bank-pb-history");
  return data;
}
