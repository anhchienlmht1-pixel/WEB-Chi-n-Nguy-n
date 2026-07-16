import { NextRequest, NextResponse } from "next/server";
import { fetchCandles, daysAgo, nowSeconds, Resolution } from "@/lib/vndirect";
import { fetchTodayIntraday } from "@/lib/intraday";

// VNDirect's dchart can be slow for long ranges; give the function more
// headroom than the default before Vercel kills it.
export const maxDuration = 30;

const INTRADAY_RESOLUTIONS = new Set<Resolution>(["1", "5", "15", "30", "60"]);

// How far back to look per candle period — each candle IS the period (a
// weekly candle covers a week, a monthly candle a month), so the lookback
// just needs to be long enough to show a meaningful number of candles at
// that resolution without pulling more than VNDirect can return quickly.
const DAYS_BY_RESOLUTION: Partial<Record<Resolution, number>> = {
  D: 180, // ~6 months of daily candles
  W: 1825, // ~5 years of weekly candles
  M: 7300, // ~20 years of monthly candles
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const resolution = (searchParams.get("resolution") || "D") as Resolution;

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }

  if (INTRADAY_RESOLUTIONS.has(resolution)) {
    const { candles, source, errors } = await fetchTodayIntraday(symbol);
    if (candles.length === 0 && source === null) {
      return NextResponse.json({ error: errors.join(" | ") }, { status: 502 });
    }
    return NextResponse.json({ symbol, candles, source });
  }

  const from = daysAgo(DAYS_BY_RESOLUTION[resolution] ?? 180);

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
