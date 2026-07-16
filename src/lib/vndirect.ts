import "server-only";
import { Candle } from "./types";

const DCHART_BASE = "https://dchart-api.vndirect.com.vn/dchart/history";

export type Resolution = "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M";

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
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://dchart.vndirect.com.vn/",
      Origin: "https://dchart.vndirect.com.vn",
    },
    next: { revalidate: 15 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[vndirect] HTTP ${res.status} for ${symbol}: ${body.slice(0, 300)}`);
    throw new Error(`VNDirect dchart trả về lỗi HTTP ${res.status} cho ${symbol}`);
  }

  const rawBody = await res.text();
  let data: UdfHistoryResponse;
  try {
    data = JSON.parse(rawBody) as UdfHistoryResponse;
  } catch {
    console.error(`[vndirect] non-JSON response for ${symbol} @${resolution}: ${rawBody.slice(0, 200)}`);
    throw new Error(`VNDirect không hỗ trợ độ phân giải "${resolution}" cho ${symbol}`);
  }

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

  return candles
    .filter(
      (candle) =>
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
    )
    .sort((a, b) => a.time - b.time);
}

/**
 * Tries each candidate symbol in order and returns the first one that
 * returns non-empty data. Some VNDirect index codes aren't consistently
 * documented (e.g. HNX-Index/UPCOM-Index naming), so this avoids hard
 * failure when one spelling doesn't match what dchart expects.
 */
export async function fetchCandlesTrying(
  candidates: string[],
  resolution: Resolution,
  from: number,
  to: number
): Promise<Candle[]> {
  let lastError: unknown;
  for (const symbol of candidates) {
    try {
      const candles = await fetchCandles(symbol, resolution, from, to);
      if (candles.length > 0) return candles;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return [];
}

export function daysAgo(days: number): number {
  return Math.floor(Date.now() / 1000) - days * 86400;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Unix seconds for today's midnight in Vietnam time (UTC+7, no DST). */
export function startOfTodayVN(): number {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const shifted = new Date(Date.now() + VN_OFFSET_MS);
  const vnMidnightUtcMs = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - VN_OFFSET_MS;
  return Math.floor(vnMidnightUtcMs / 1000);
}
