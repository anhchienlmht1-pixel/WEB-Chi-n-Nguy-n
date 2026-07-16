import { NextRequest, NextResponse } from "next/server";
import { fetchCandles, daysAgo, nowSeconds, startOfTodayVN, Resolution } from "@/lib/vndirect";

const RANGE_DAYS: Record<string, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
};

const INTRADAY_RESOLUTIONS = new Set<Resolution>(["1", "5", "15", "30", "60"]);

// HOSE opened in 2000; using this as the "from" for an all-time range just
// asks VNDirect for everything it has, however far back that goes.
const ALL_TIME_FROM = Math.floor(new Date("2000-01-01T00:00:00+07:00").getTime() / 1000);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const resolution = (searchParams.get("resolution") || "D") as Resolution;
  const range = searchParams.get("range") || "3M";

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }

  const isIntraday = INTRADAY_RESOLUTIONS.has(resolution);
  const from = isIntraday
    ? startOfTodayVN()
    : range === "Tất cả"
      ? ALL_TIME_FROM
      : daysAgo(RANGE_DAYS[range] ?? 90);

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
