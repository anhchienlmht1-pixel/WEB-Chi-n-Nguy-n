import { NextRequest, NextResponse } from "next/server";
import { fetchCandles, daysAgo, nowSeconds, startOfTodayVN, Resolution } from "@/lib/vndirect";
import { fetchVciCandles } from "@/lib/vci";
import { Candle } from "@/lib/types";

// VNDirect's dchart can be slow for long ranges; give the function more
// headroom than the default before Vercel kills it.
export const maxDuration = 30;

const RANGE_DAYS: Record<string, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
  // Not literally "since HOSE opened in 2000" — a 25-year daily request is
  // slow enough to risk timing out, and most listed tickers don't go back
  // that far anyway. 10 years covers the full history for the vast
  // majority of symbols while staying well within the same order of
  // magnitude as the 2Y request, which is known to work reliably.
  "Tất cả": 3650,
};

const INTRADAY_RESOLUTIONS = new Set<Resolution>(["1", "5", "15", "30", "60"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const resolution = (searchParams.get("resolution") || "D") as Resolution;
  const range = searchParams.get("range") || "3M";

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }

  const isIntraday = INTRADAY_RESOLUTIONS.has(resolution);

  if (isIntraday) {
    return await fetchIntraday(symbol);
  }

  const from = daysAgo(RANGE_DAYS[range] ?? 90);

  try {
    const candles = await fetchCandles(symbol, resolution, from, nowSeconds());
    return NextResponse.json({ symbol, candles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi không xác định" },
      { status: 502 }
    );
  }
}

// VN sessions run 9:00-11:30 and 13:00-15:00 — well under 300 one-minute bars.
const INTRADAY_BAR_COUNT = 300;

/**
 * Tries VNDirect first (same source used everywhere else on the site), and
 * falls back to Vietcap's trading platform if it comes back empty or
 * errors — two independent brokerage sources instead of a single point of
 * failure for the live intraday chart.
 */
async function fetchIntraday(symbol: string) {
  const todayStart = startOfTodayVN();
  const errors: string[] = [];

  try {
    const candles = await fetchCandles(symbol, "1", todayStart, nowSeconds());
    if (candles.length > 0) return NextResponse.json({ symbol, candles, source: "vndirect" });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "VNDirect: lỗi không xác định");
  }

  try {
    const raw = await fetchVciCandles(symbol, "ONE_MINUTE", nowSeconds(), INTRADAY_BAR_COUNT);
    const candles: Candle[] = raw.filter((c) => c.time >= todayStart);
    return NextResponse.json({ symbol, candles, source: "vci" });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Vietcap: lỗi không xác định");
  }

  return NextResponse.json({ error: errors.join(" | ") }, { status: 502 });
}
