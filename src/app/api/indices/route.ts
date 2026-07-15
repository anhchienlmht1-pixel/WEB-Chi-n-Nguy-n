import { NextResponse } from "next/server";
import { fetchCandles, daysAgo, nowSeconds } from "@/lib/vndirect";
import { IndexCode, IndexQuote } from "@/lib/types";

const INDICES: { code: IndexCode; name: string }[] = [
  { code: "VNINDEX", name: "VN-Index" },
  { code: "HNXINDEX", name: "HNX-Index" },
  { code: "UPCOMINDEX", name: "UPCOM-Index" },
];

async function indexFor(code: IndexCode, name: string): Promise<IndexQuote | null> {
  const candles = await fetchCandles(code, "D", daysAgo(30), nowSeconds());
  if (candles.length === 0) return null;

  const last = candles[candles.length - 1];
  const prev = candles.length > 1 ? candles[candles.length - 2] : last;

  return {
    code,
    name,
    value: last.close,
    change: last.close - prev.close,
    changePercent: prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0,
    volume: last.volume,
    history: candles.map((c) => ({ time: c.time, value: c.close })),
  };
}

export async function GET() {
  const results = await Promise.allSettled(
    INDICES.map((idx) => indexFor(idx.code, idx.name))
  );

  const indices: IndexQuote[] = [];
  const errors: string[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      indices.push(result.value);
    } else {
      errors.push(INDICES[i].code);
    }
  });

  return NextResponse.json({ indices, failed: errors });
}
