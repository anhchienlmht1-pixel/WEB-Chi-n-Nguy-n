import { NextRequest, NextResponse } from "next/server";
import { fetchCandles, daysAgo, nowSeconds, Resolution } from "@/lib/vndirect";
import { fetchTodayIntraday } from "@/lib/intraday";

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
    const { candles, source, errors } = await fetchTodayIntraday(symbol);
    if (candles.length === 0 && source === null) {
      return NextResponse.json({ error: errors.join(" | ") }, { status: 502 });
    }
    return NextResponse.json({ symbol, candles, source });
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
