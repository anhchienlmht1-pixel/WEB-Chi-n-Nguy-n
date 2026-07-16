import { NextRequest, NextResponse } from "next/server";
import { fetchFireantCandles, daysAgoMs, nowMs } from "@/lib/fireant";
import { ceilingPrice, floorPrice } from "@/lib/market";
import { findStock } from "@/lib/symbols";
import { StockQuote } from "@/lib/types";

async function quoteFor(symbol: string): Promise<StockQuote | null> {
  const candles = await fetchFireantCandles(symbol, "1D", daysAgoMs(10), nowMs());
  if (candles.length === 0) return null;

  const last = candles[candles.length - 1];
  const prev = candles.length > 1 ? candles[candles.length - 2] : last;
  const refPrice = prev.close;
  const exchange = findStock(symbol)?.exchange ?? "HOSE";
  const ceiling = ceilingPrice(refPrice, exchange);
  const floor = floorPrice(refPrice, exchange);

  return {
    symbol,
    refPrice,
    ceilingPrice: ceiling,
    floorPrice: floor,
    price: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    change: last.close - refPrice,
    changePercent: refPrice ? ((last.close - refPrice) / refPrice) * 100 : 0,
    volume: last.volume,
    updatedAt: last.time,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols");

  if (!symbolsParam) {
    return NextResponse.json({ error: "Thiếu tham số symbols" }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const results = await Promise.allSettled(symbols.map(quoteFor));

  const quotes: StockQuote[] = [];
  const errors: string[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      quotes.push(result.value);
    } else {
      errors.push(symbols[i]);
    }
  });

  return NextResponse.json({ quotes, failed: errors });
}
