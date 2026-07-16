import "server-only";
import { fetchCandles, startOfTodayVN, nowSeconds } from "./vndirect";
import { fetchVciCandles } from "./vci";
import { Candle } from "./types";

// VN sessions run 9:00-11:30 and 13:00-15:00 — well under 300 one-minute bars.
const INTRADAY_BAR_COUNT = 300;

// Keep each source on a short leash — a hung request to either one should
// never be able to stall the page waiting on it.
const SOURCE_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: quá thời gian chờ`)), ms)),
  ]);
}

export interface IntradayResult {
  candles: Candle[];
  source: "vndirect" | "vci" | null;
  errors: string[];
}

/**
 * Fetches today's 1-minute candles from VNDirect and Vietcap's trading
 * platform *in parallel* (not one after the other) and takes whichever
 * comes back with data — VNDirect wins if both do. Two independent
 * brokerage sources for the live/intraday price, used both by the
 * intraday chart and by the quote/index endpoints, without doubling the
 * wait time on the common case where the first source is just slow rather
 * than actually down.
 */
export async function fetchTodayIntraday(symbol: string): Promise<IntradayResult> {
  const todayStart = startOfTodayVN();

  const [vndirectResult, vciResult] = await Promise.allSettled([
    withTimeout(fetchCandles(symbol, "1", todayStart, nowSeconds()), SOURCE_TIMEOUT_MS, "VNDirect"),
    withTimeout(
      fetchVciCandles(symbol, "ONE_MINUTE", nowSeconds(), INTRADAY_BAR_COUNT),
      SOURCE_TIMEOUT_MS,
      "Vietcap"
    ),
  ]);

  const errors: string[] = [];

  if (vndirectResult.status === "fulfilled" && vndirectResult.value.length > 0) {
    return { candles: vndirectResult.value, source: "vndirect", errors };
  }
  if (vndirectResult.status === "rejected") {
    errors.push(vndirectResult.reason instanceof Error ? vndirectResult.reason.message : "VNDirect: lỗi không xác định");
  }

  if (vciResult.status === "fulfilled") {
    const candles = vciResult.value.filter((c) => c.time >= todayStart);
    if (candles.length > 0) return { candles, source: "vci", errors };
  } else {
    errors.push(vciResult.reason instanceof Error ? vciResult.reason.message : "Vietcap: lỗi không xác định");
  }

  return { candles: [], source: null, errors };
}
