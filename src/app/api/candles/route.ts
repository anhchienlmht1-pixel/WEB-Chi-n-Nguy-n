import { NextRequest, NextResponse } from "next/server";
import { fetchCandles, daysAgo, nowSeconds, Resolution } from "@/lib/vndirect";

const RANGE_DAYS: Record<string, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const resolution = (searchParams.get("resolution") || "D") as Resolution;
  const range = searchParams.get("range") || "3M";

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }

  const days = RANGE_DAYS[range] ?? 90;

  try {
    const candles = await fetchCandles(symbol, resolution, daysAgo(days), nowSeconds());
    return NextResponse.json({ symbol, candles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi không xác định" },
      { status: 502 }
    );
  }
}
