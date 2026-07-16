import "server-only";
import { fetchCandles, startOfTodayVN, nowSeconds } from "./vndirect";
import { fetchVciCandles } from "./vci";
import { Candle } from "./types";

// VN sessions run 9:00-11:30 and 13:00-15:00 — well under 300 one-minute bars.
const INTRADAY_BAR_COUNT = 300;

export interface IntradayResult {
  candles: Candle[];
  source: "vndirect" | "vci" | null;
  errors: string[];
}

/**
 * Fetches today's 1-minute candles, trying VNDirect first and falling back
 * to Vietcap's trading platform if it errors or comes back empty — two
 * independent brokerage sources for the live/intraday price, used both by
 * the intraday chart and by the quote/index endpoints (whose "current
 * price" would otherwise silently be a stale daily close on any day
 * VNDirect's daily feed doesn't include a live in-progress bar).
 */
export async function fetchTodayIntraday(symbol: string): Promise<IntradayResult> {
  const todayStart = startOfTodayVN();
  const errors: string[] = [];

  try {
    const candles = await fetchCandles(symbol, "1", todayStart, nowSeconds());
    if (candles.length > 0) return { candles, source: "vndirect", errors };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "VNDirect: lỗi không xác định");
  }

  try {
    const raw = await fetchVciCandles(symbol, "ONE_MINUTE", nowSeconds(), INTRADAY_BAR_COUNT);
    const candles = raw.filter((c) => c.time >= todayStart);
    return { candles, source: "vci", errors };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Vietcap: lỗi không xác định");
  }

  return { candles: [], source: null, errors };
}
