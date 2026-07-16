import "server-only";
import { Candle } from "./types";

const FIREANT_BASE = "https://restv2.fireant.vn";

interface RawBar {
  date?: string;
  time?: string | number;
  timestamp?: string | number;
  open?: number;
  o?: number;
  high?: number;
  h?: number;
  low?: number;
  l?: number;
  close?: number;
  c?: number;
  priceClose?: number;
  dealVolume?: number;
  volume?: number;
  v?: number;
}

function toUnixSeconds(bar: RawBar): number {
  const raw = bar.date ?? bar.timestamp ?? bar.time;
  if (typeof raw === "number") {
    // Millisecond timestamps are ~13 digits; second timestamps ~10.
    return raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw);
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  return NaN;
}

function toCandle(bar: RawBar): Candle {
  return {
    time: toUnixSeconds(bar),
    open: Number(bar.open ?? bar.o),
    high: Number(bar.high ?? bar.h),
    low: Number(bar.low ?? bar.l),
    close: Number(bar.close ?? bar.c ?? bar.priceClose),
    volume: Number(bar.dealVolume ?? bar.volume ?? bar.v ?? 0),
  };
}

/**
 * Fetches OHLCV candles for a symbol from FireAnt's public REST API
 * (restv2.fireant.vn). This is not an officially documented third-party
 * API — it's the same endpoint FireAnt's own site calls — so treat it the
 * same way as the VNDirect integration: best-effort, with defensive
 * parsing and a clear error surfaced to the UI on failure.
 */
export async function fetchFireantCandles(
  symbol: string,
  resolution: "1D" | "1W" | "1M",
  fromMs: number,
  toMs: number
): Promise<Candle[]> {
  const url = `${FIREANT_BASE}/symbols/${encodeURIComponent(
    symbol
  )}/bars?resolution=${resolution}&from=${fromMs}&to=${toMs}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: "https://fireant.vn/",
      Origin: "https://fireant.vn",
    },
    next: { revalidate: 15 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[fireant] HTTP ${res.status} for ${symbol}: ${body.slice(0, 300)}`);
    throw new Error(`FireAnt trả về lỗi HTTP ${res.status} cho ${symbol}`);
  }

  const data = await res.json();
  const list: RawBar[] = Array.isArray(data) ? data : (data?.data ?? data?.bars ?? []);

  return list
    .map(toCandle)
    .filter(
      (c) =>
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close)
    )
    .sort((a, b) => a.time - b.time);
}

export function daysAgoMs(days: number): number {
  return Date.now() - days * 86400 * 1000;
}

export function nowMs(): number {
  return Date.now();
}

/** Tries each candidate symbol in order, returns the first with data. */
export async function fetchFireantCandlesTrying(
  candidates: string[],
  resolution: "1D" | "1W" | "1M",
  fromMs: number,
  toMs: number
): Promise<Candle[]> {
  let lastError: unknown;
  for (const symbol of candidates) {
    try {
      const candles = await fetchFireantCandles(symbol, resolution, fromMs, toMs);
      if (candles.length > 0) return candles;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return [];
}
