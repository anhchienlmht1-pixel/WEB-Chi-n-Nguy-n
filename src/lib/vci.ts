import "server-only";
import { Candle } from "./types";

// Vietcap Securities' own trading platform (trading.vietcap.com.vn) — a real
// brokerage "bảng điện". Used as a fallback for the intraday chart when
// VNDirect returns nothing, since it's actively used by the vnstock
// community library and doesn't require an API key.
const CHART_URL = "https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart";

type TimeFrame = "ONE_MINUTE" | "ONE_HOUR" | "ONE_DAY";

interface VciArrayShape {
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
}

interface VciRow {
  t?: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
}

function parseVciPayload(json: unknown): Candle[] {
  const root =
    json && typeof json === "object" && "data" in (json as Record<string, unknown>)
      ? (json as Record<string, unknown>).data
      : json;

  const list = Array.isArray(root) ? root : root ? [root] : [];
  if (list.length === 0) return [];

  const first = list[0] as VciArrayShape | VciRow;

  if (first && Array.isArray((first as VciArrayShape).t)) {
    const shape = first as VciArrayShape;
    const t = shape.t ?? [];
    return t.map((time, i) => ({
      time,
      open: Number(shape.o?.[i]),
      high: Number(shape.h?.[i]),
      low: Number(shape.l?.[i]),
      close: Number(shape.c?.[i]),
      volume: Number(shape.v?.[i] ?? 0),
    }));
  }

  return (list as VciRow[]).map((row) => ({
    time: Number(row.t),
    open: Number(row.o),
    high: Number(row.h),
    low: Number(row.l),
    close: Number(row.c),
    volume: Number(row.v ?? 0),
  }));
}

/**
 * Fetches recent 1-minute candles for a symbol from Vietcap's public chart
 * API (no API key required). `countBack` bars ending at `to`; for an
 * intraday view this is a small enough window that VN sessions never
 * exceed it, so the result only ever spans (at most) the last trading day.
 */
export async function fetchVciCandles(
  symbol: string,
  timeFrame: TimeFrame,
  to: number,
  countBack: number
): Promise<Candle[]> {
  const res = await fetch(CHART_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://trading.vietcap.com.vn/",
      Origin: "https://trading.vietcap.com.vn",
    },
    body: JSON.stringify({
      timeFrame,
      symbols: [symbol],
      to,
      countBack,
    }),
    next: { revalidate: 5 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[vci] HTTP ${res.status} for ${symbol}: ${body.slice(0, 300)}`);
    throw new Error(`Vietcap trả về lỗi HTTP ${res.status} cho ${symbol}`);
  }

  const json = await res.json();
  return parseVciPayload(json)
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
