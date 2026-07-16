import axios from "axios";
import type { Quote, SearchResult } from "../types";

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

export async function fetchQuote(symbol: string): Promise<Quote> {
  const { data } = await api.get(`/quote/${encodeURIComponent(symbol)}`);
  return data;
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await api.get("/search", { params: { q: query } });
  return data.results;
}
