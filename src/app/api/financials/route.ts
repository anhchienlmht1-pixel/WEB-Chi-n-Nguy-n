import { NextRequest, NextResponse } from "next/server";
import { fetchVciRatios } from "@/lib/vciFinancials";

export const maxDuration = 30;

// Most recent N quarters/years shown — enough for QoQ/YoY context without
// an unbounded table.
const MAX_PERIODS = 8;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }

  try {
    const points = await fetchVciRatios(symbol);
    return NextResponse.json({ symbol, points: points.slice(-MAX_PERIODS) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi không xác định" },
      { status: 502 }
    );
  }
}
