import { put, head } from "@vercel/blob";
import { getFullMarketQuotes } from "../providers/vnstockProvider.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { dedupeSameDay, computeBuySeries, latestBuySince, checkCanSlimFundamentals } from "./trendScanner.js";

// Full-universe (~1,600 HOSE/HNX/UPCOM symbols) trend-following scan,
// spread across many Cron ticks instead of one request — Vercel's 30s
// function ceiling (vercel.json) can't fit a live per-symbol history fetch
// + indicator computation for that many tickers in one call the way the
// old STOCK_UNIVERSE-only scanBuySignals() could for ~70. Each tick
// processes as many roster symbols as fit in TIME_BUDGET_MS, persists
// progress to Vercel Blob, and picks up where it left off next tick —
// wrapping around to a fresh roster once a full cycle completes. Routes
// read whatever's in `latestBySymbol` at request time: a continuously
// self-refreshing, eventually-consistent view rather than an all-or-
// nothing snapshot.
const BLOB_PATHNAME = "trend-scan/state.json";
const TIME_BUDGET_MS = 22_000; // safety margin under vercel.json's 30s maxDuration
const CONCURRENCY = 20;

export interface ScannedSymbol {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  changePercent: number;
  // Raw last-bar condition (SMA20>SMA50, ADX>25, Supertrend up) — all
  // tradeJournal.ts needs; independent of the CAN SLIM filter below.
  isBuy: boolean;
  // Set only when latestBuySince found an active streak AND the symbol
  // passed the CAN SLIM fundamentals screen — what /trend-signals shows.
  buySignal: { buyDate: string; buyPrice: number; signalReturnPercent: number } | null;
  scannedAt: string;
}

interface RosterSeed {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
}

interface ScanState {
  roster: RosterSeed[];
  cursor: number;
  latestBySymbol: Record<string, ScannedSymbol>;
  lastFullCycleCompletedAt: string | null;
}

const EMPTY_STATE: ScanState = { roster: [], cursor: 0, latestBySymbol: {}, lastFullCycleCompletedAt: null };

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readState(): Promise<ScanState> {
  if (!blobConfigured()) return EMPTY_STATE;
  try {
    const meta = await head(BLOB_PATHNAME);
    const res = await fetch(meta.url);
    if (!res.ok) return EMPTY_STATE;
    return (await res.json()) as ScanState;
  } catch {
    // No blob saved yet (first Cron tick ever) or a transient error —
    // either way, start from an empty roster/cursor.
    return EMPTY_STATE;
  }
}

async function writeState(state: ScanState): Promise<void> {
  if (!blobConfigured()) return;
  await put(BLOB_PATHNAME, JSON.stringify(state), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function scanOneSymbol(seed: RosterSeed): Promise<ScannedSymbol | null> {
  try {
    const { points: raw } = await getHistoryWithFallback(seed.symbol, "1Y");
    const points = dedupeSameDay(raw);
    if (points.length === 0) return null;

    const series = computeBuySeries(points);
    const lastBar = series[series.length - 1];
    const last = points[points.length - 1];
    const prev = points.length > 1 ? points[points.length - 2] : null;
    const changePercent = prev && prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;

    let buySignal: ScannedSymbol["buySignal"] = null;
    const signalDates = latestBuySince(points);
    if (signalDates) {
      // Only worth the extra financial-report fetch for symbols that
      // already cleared the technical condition — keeps the CAN SLIM
      // check from doubling the cost of every symbol in the roster.
      const hasSolidFundamentals = await checkCanSlimFundamentals(seed.symbol);
      if (hasSolidFundamentals) {
        buySignal = {
          buyDate: signalDates.buyDate,
          buyPrice: signalDates.buyPrice,
          signalReturnPercent: signalDates.buyPrice
            ? ((last.close - signalDates.buyPrice) / signalDates.buyPrice) * 100
            : 0,
        };
      }
    }

    return {
      symbol: seed.symbol,
      name: seed.name,
      exchange: seed.exchange,
      currency: seed.currency,
      price: last.close,
      changePercent,
      isBuy: lastBar?.isBuy ?? false,
      buySignal,
      scannedAt: new Date().toISOString(),
    };
  } catch {
    // A single symbol's data being unavailable this tick must not stall
    // the batch — it just keeps whatever value (if any) it had before.
    return null;
  }
}

// One Cron tick: scans as many roster symbols as fit in TIME_BUDGET_MS,
// resuming from the saved cursor, and starts a fresh roster fetch once
// the previous cycle wraps around.
export async function runScanBatch(): Promise<{ processed: number; cycleComplete: boolean; rosterSize: number }> {
  const state = await readState();

  if (state.cursor === 0 || state.roster.length === 0) {
    const quotes = await getFullMarketQuotes("ALL");
    state.roster = quotes.map((q) => ({ symbol: q.symbol, name: q.name, exchange: q.exchange, currency: q.currency }));
    state.cursor = 0;
  }

  const startedAt = Date.now();
  let cursor = state.cursor;
  let processed = 0;

  async function worker(): Promise<void> {
    while (cursor < state.roster.length && Date.now() - startedAt < TIME_BUDGET_MS) {
      const seed = state.roster[cursor];
      cursor += 1; // synchronous w.r.t. the check above — safe without a lock
      const result = await scanOneSymbol(seed);
      if (result) state.latestBySymbol[seed.symbol] = result;
      processed += 1;
    }
  }

  const workerCount = Math.min(CONCURRENCY, state.roster.length - state.cursor);
  await Promise.all(Array.from({ length: workerCount }, worker));

  state.cursor = cursor;
  const cycleComplete = state.cursor >= state.roster.length;
  if (cycleComplete) {
    state.lastFullCycleCompletedAt = new Date().toISOString();
    state.cursor = 0; // next tick re-fetches the roster fresh
  }

  await writeState(state);
  return { processed, cycleComplete, rosterSize: state.roster.length };
}

export async function getScannedSymbols(): Promise<ScannedSymbol[]> {
  const state = await readState();
  return Object.values(state.latestBySymbol);
}
