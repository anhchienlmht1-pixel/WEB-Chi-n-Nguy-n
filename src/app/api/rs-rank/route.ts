import { NextRequest, NextResponse } from "next/server";
import { computeRsRank } from "@/lib/rsRank";

// A cache-miss scan fans out across the whole board (~50 symbols); give it
// more headroom than the default serverless timeout.
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }

  try {
    const result = await computeRsRank(symbol);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định khi tính xếp hạng sức mạnh giá";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
