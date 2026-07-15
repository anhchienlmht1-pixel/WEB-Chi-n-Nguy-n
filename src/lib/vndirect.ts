import "server-only";
import { Candle } from "./types";

const DCHART_BASE = "https://dchart-api.vndirect.com.vn/dchart/history";

export type Resolution = "D" | "W" | "M";

interface UdfHistoryResponse {
  s: "ok" | "no_data" | "error";
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
  errmsg?: string;
}

/**
 * Fetches OHLCV candles for a symbol or index code from VNDirect's public
 * dchart API (TradingView-compatible UDF history endpoint). No API key is
 * required. Throws on network/parse failure so callers can show a proper
 * error state instead of silently rendering fake data.
 */
export async function fetchCandles(
  symbol: string,
  resolution: Resolution,
  from: number,
  to: number
): Promise<Candle[]> {
  const url = `${DCHART_BASE}?resolution=${resolution}&symbol=${encodeURIComponent(
    symbol
  )}&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; StockBoard/1.0)" },
    next: { revalidate: 15 },
  });

  if (!res.ok) {
    throw new Error(`VNDirect dchart trả về lỗi HTTP ${res.status} cho ${symbol}`);
  }

  const data = (await res.json()) as UdfHistoryResponse;

  if (data.s !== "ok" || !data.t) {
    if (data.s === "no_data") return [];
    throw new Error(data.errmsg || `Không có dữ liệu cho ${symbol}`);
  }

  const { t, o = [], h = [], l = [], c = [], v = [] } = data;

  const candles: Candle[] = t.map((time, i) => ({
    time,
    open: o[i],
    high: h[i],
    low: l[i],
    close: c[i],
    volume: v[i] ?? 0,
  }));

  return candles.filter(
    (candle) =>
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
  );
}

export function daysAgo(days: number): number {
  return Math.floor(Date.now() / 1000) - days * 86400;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
