import { NextResponse } from "next/server";
import { fetchCandlesTrying, daysAgo, nowSeconds } from "@/lib/vndirect";
import { IndexCode, IndexQuote } from "@/lib/types";

const INDICES: { code: IndexCode; name: string; candidates: string[] }[] = [
  { code: "VNINDEX", name: "VN-Index", candidates: ["VNINDEX"] },
  { code: "HNXINDEX", name: "HNX-Index", candidates: ["HNXINDEX", "HNX-INDEX", "HNX"] },
  { code: "UPCOMINDEX", name: "UPCOM-Index", candidates: ["UPCOMINDEX", "UPCOM-INDEX", "UPCOM"] },
];

async function indexFor(code: IndexCode, name: string, candidates: string[]): Promise<IndexQuote | null> {
  const candles = await fetchCandlesTrying(candidates, "D", daysAgo(30), nowSeconds());
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
    INDICES.map((idx) => indexFor(idx.code, idx.name, idx.candidates))
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
