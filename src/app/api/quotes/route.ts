import { NextRequest, NextResponse } from "next/server";
import { fetchCandles, daysAgo, nowSeconds, startOfTodayVN } from "@/lib/vndirect";
import { fetchTodayIntraday } from "@/lib/intraday";
import { ceilingPrice, floorPrice } from "@/lib/market";
import { findStock } from "@/lib/symbols";
import { StockQuote } from "@/lib/types";

// Each symbol now does a daily fetch plus an intraday fetch (with a
// fallback source), so a full board request needs more headroom than the
// default serverless timeout.
export const maxDuration = 30;

async function quoteFor(symbol: string): Promise<StockQuote | null> {
  // Independent requests — run them concurrently instead of one after the
  // other so a symbol's quote never takes longer than the slower of the two.
  const [dailyCandles, { candles: intraday }] = await Promise.all([
    fetchCandles(symbol, "D", daysAgo(10), nowSeconds()),
    fetchTodayIntraday(symbol),
  ]);
  if (dailyCandles.length === 0) return null;

  // The reference price (tham chiếu) must be the last *fully closed*
  // trading day's close. Relying on "second-to-last daily candle" silently
  // assumes the last one is today's live bar — if VNDirect's daily feed
  // instead only finalizes today's bar after market close, that shifts
  // both the reference price and the "current" price back by a day.
  // Filtering by an explicit cutoff is correct either way.
  const todayStart = startOfTodayVN();
  const priorDays = dailyCandles.filter((c) => c.time < todayStart);
  const refCandle = priorDays[priorDays.length - 1] ?? dailyCandles[dailyCandles.length - 1];
  const refPrice = refCandle.close;

  let price: number;
  let open: number;
  let high: number;
  let low: number;
  let volume: number;
  let updatedAt: number;

  if (intraday.length > 0) {
    const lastBar = intraday[intraday.length - 1];
    price = lastBar.close;
    open = intraday[0].open;
    high = Math.max(...intraday.map((c) => c.high));
    low = Math.min(...intraday.map((c) => c.low));
    volume = intraday.reduce((sum, c) => sum + c.volume, 0);
    updatedAt = lastBar.time;
  } else {
    // No intraday data yet (pre-market, or both sources unavailable) — fall
    // back to the most recent daily bar so the page still shows something.
    const lastDaily = dailyCandles[dailyCandles.length - 1];
    price = lastDaily.close;
    open = lastDaily.open;
    high = lastDaily.high;
    low = lastDaily.low;
    volume = lastDaily.volume;
    updatedAt = lastDaily.time;
  }

  const exchange = findStock(symbol)?.exchange ?? "HOSE";
  const ceiling = ceilingPrice(refPrice, exchange);
  const floor = floorPrice(refPrice, exchange);

  return {
    symbol,
    refPrice,
    ceilingPrice: ceiling,
    floorPrice: floor,
    price,
    open,
    high,
    low,
    change: price - refPrice,
    changePercent: refPrice ? ((price - refPrice) / refPrice) * 100 : 0,
    volume,
    updatedAt,
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
