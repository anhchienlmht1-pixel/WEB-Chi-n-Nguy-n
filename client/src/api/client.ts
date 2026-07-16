import axios from "axios";
import type { HistoryPoint, HistoryRange, Quote, SearchResult } from "../types";

const api = axios.create({ baseURL: "/api" });

export async function fetchMarketOverview(): Promise<{ provider: string; quotes: Quote[] }> {
  const { data } = await api.get("/market/overview");
  return data;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const { data } = await api.get(`/quote/${encodeURIComponent(symbol)}`);
  return data;
}

export async function fetchHistory(
  symbol: string,
  range: HistoryRange
): Promise<{ symbol: string; range: HistoryRange; points: HistoryPoint[] }> {
  const { data } = await api.get(`/history/${encodeURIComponent(symbol)}`, {
    params: { range },
  });
  return data;
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await api.get("/search", { params: { q: query } });
  return data.results;
}
