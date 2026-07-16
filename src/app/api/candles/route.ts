import { NextRequest, NextResponse } from "next/server";
import { fetchCandlesTrying, daysAgo, nowSeconds, startOfTodayVN } from "@/lib/vndirect";
import { fetchTodayIntraday } from "@/lib/intraday";
import { aggregateCandles, ChartResolution } from "@/lib/aggregate";
import { Candle } from "@/lib/types";

const RESOLUTIONS: ChartResolution[] = ["D", "W", "M"];

// ~20 years back covers every VN-listed company since founding; VNDirect
// just returns whatever it actually has, so an overshoot is harmless.
const HISTORY_DAYS = 20 * 365;

function buildLiveDailyBar(candles: Candle[]): Candle | null {
  if (candles.length === 0) return null;
  const open = candles[0].open;
  const close = candles[candles.length - 1].close;
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;
  for (const c of candles) {
    high = Math.max(high, c.high);
    low = Math.min(low, c.low);
    volume += c.volume;
  }
  return { time: startOfTodayVN(), open, high, low, close, volume };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const resolution = (searchParams.get("resolution") as ChartResolution | null) ?? "D";

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }
  if (!RESOLUTIONS.includes(resolution)) {
    return NextResponse.json({ error: `Tham số resolution phải là một trong: ${RESOLUTIONS.join(", ")}` }, { status: 400 });
  }

  try {
    const daily = await fetchCandlesTrying([symbol], "D", daysAgo(HISTORY_DAYS), nowSeconds());

    // The last daily bar from VNDirect is yesterday's close until VNDirect
    // finalizes today's session — replace/append it with a live bar built
    // from today's intraday candles so the chart shows the real current
    // price instead of a stale one (this was the STB "wrong price" bug).
    let candles = daily;
    const todayStart = startOfTodayVN();
    if (candles.length === 0 || candles[candles.length - 1].time < todayStart) {
      const intraday = await fetchTodayIntraday(symbol);
      const liveBar = buildLiveDailyBar(intraday.candles);
      if (liveBar) candles = [...candles, liveBar];
    } else if (candles[candles.length - 1].time === todayStart) {
      const intraday = await fetchTodayIntraday(symbol);
      const liveBar = buildLiveDailyBar(intraday.candles);
      if (liveBar) candles = [...candles.slice(0, -1), liveBar];
    }

    const result = aggregateCandles(candles, resolution);
    return NextResponse.json({ candles: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định khi tải dữ liệu biểu đồ";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
