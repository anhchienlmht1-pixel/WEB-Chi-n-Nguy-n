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
} from "../types";

const api = axios.create({ baseURL: "/api", timeout: 30000 });

// Prefer the server's JSON error message ({"error": "..."}) over axios's
// generic "Request failed with status code 500" so users see what's wrong.
// Normally axios auto-parses a JSON response into `.data` as an object,
// but if the response's Content-Type ever isn't exactly application/json
// (seen on Vercel's serverless runtime for reasons not reproducible in
// local dev), `.data` arrives as a raw string instead — handle that case
// too instead of silently falling back to the generic message.
//
// Also handle rate limiting (429, 503) with user-friendly messages
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

  // Handle rate limit errors with friendly messages
  if (error?.response?.status === 429 || error?.response?.status === 503) {
    error.message =
      error.message ||
      "⏸️ Đã đạt giới hạn truy cập API. Vui lòng tải lại sau 1-2 phút hoặc kiểm tra hạng thành viên tài khoản";
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
  // Open/buy date
  buyDate: string;
  // Close price on buyDate — basis for signalReturnPercent
  buyPrice: number;
  // % change from buyPrice to current price — cumulative return since the
  // signal started, not to be confused with changePercent (today's move).
  signalReturnPercent: number;
  // Close/sell date (null if still holding)
  sellDate: string | null;
}

export interface TrendBuyResult {
  items: TrendBuySignal[];
  // Vietnam date (YYYY-MM-DD) of the closed session this conclusion was
  // drawn from — the list only changes after a session closes (15:00), so
  // during the day it still reads "Chốt phiên <the previous session>".
  sessionDate: string;
}

// Same trend-following combo as a chart's own Mua/Bán markers (SMA20 >
// SMA50, ADX(14) > 25, Supertrend(10,3) uptrend), scanned across the whole
// stock universe server-side from CLOSED daily bars only ("chỉ kết luận khi
// đóng phiên") — see server/src/signals/trendScanner.ts.
export async function fetchTrendBuyResult(): Promise<TrendBuyResult> {
  const { data } = await api.get("/trend-signals");
  return { items: data.items, sessionDate: data.sessionDate };
}

export async function fetchTrendBuySignals(): Promise<TrendBuySignal[]> {
  return (await fetchTrendBuyResult()).items;
}

export interface JournalPosition {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  buyDate: string;
  buyPrice: number;
}

export interface JournalClosedTrade extends JournalPosition {
  sellDate: string;
  sellPrice: number;
  returnPercent: number;
  holdingDays: number;
}

export interface TradeJournal {
  // First date the journal is allowed to record anything — deliberately
  // not backdated, so numbers can't be accused of being a hindsight
  // backtest — see server/src/signals/tradeJournal.ts.
  startDate: string;
  open: JournalPosition[];
  closed: JournalClosedTrade[];
}

// "Lịch sử giao dịch" — a real, forward-only log of the system's own
// Mua/Bán combo (same as TrendBuySignal) rather than a backtest over
// historical prices.
export async function fetchTradeJournal(): Promise<TradeJournal> {
  const { data } = await api.get("/trend-signals/journal");
  return data;
}

