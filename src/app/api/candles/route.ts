import { NextRequest, NextResponse } from "next/server";
import { fetchCandles, daysAgo, nowSeconds, Resolution } from "@/lib/vndirect";
import { fetchTodayIntraday } from "@/lib/intraday";
import { aggregateCandles } from "@/lib/aggregate";

// VNDirect's dchart can be slow for long ranges; give the function more
// headroom than the default before Vercel kills it.
export const maxDuration = 30;

const INTRADAY_RESOLUTIONS = new Set<Resolution>(["1", "5", "15", "30", "60"]);

// How far back to look per candle period — each candle IS the period (a
// weekly candle covers a week, a monthly candle a month), so the lookback
// just needs to be long enough to show a meaningful number of candles at
// that resolution without pulling more daily data than can be fetched
// quickly (weekly/monthly are built by aggregating daily bars — see below).
const DAYS_BY_RESOLUTION: Record<"D" | "W" | "M", number> = {
  D: 180, // ~6 months of daily candles
  W: 1825, // ~5 years, aggregated into weekly candles
  M: 3650, // ~10 years, aggregated into monthly candles
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

  // VNDirect's dchart only actually supports daily resolution — asking for
  // W/M returns a plain-text "Not supported" body instead of JSON. Fetch
  // daily bars for the full lookback and bucket them into weekly/monthly
  // candles ourselves rather than depending on upstream support that isn't
  // there.
  const needsAggregation = resolution === "W" || resolution === "M";
  const days = DAYS_BY_RESOLUTION[resolution as "D" | "W" | "M"] ?? 180;
  const from = daysAgo(days);

  try {
    const daily = await fetchCandles(symbol, needsAggregation ? "D" : resolution, from, nowSeconds());
    const candles = needsAggregation
      ? aggregateCandles(daily, resolution === "W" ? "week" : "month")
      : daily;
    return NextResponse.json({ symbol, candles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi không xác định" },
      { status: 502 }
    );
  }
}
