import { put, head } from "@vercel/blob";
import { getFullMarketQuotes } from "../providers/vnstockProvider.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { dedupeSameDay, computeBuySeries, latestBuySince, checkCanSlimFundamentals } from "./trendScanner.js";
import { computeBStarState } from "./bstarScanner.js";

// Trend-following scan over the ROSTER_SIZE most-liquid symbols across the
// whole exchange board (HOSE/HNX/UPCOM, from getFullMarketQuotes — far
// more than the old ~70-symbol hand-curated STOCK_UNIVERSE, but short of
// the full ~1,600-symbol board), spread across many Cron ticks instead of
// one request. This project is on Vercel's Hobby plan: maxDuration caps at
// 10s (vercel.json) and Cron fires at most once a day, so a single request
// can't fit a live per-symbol history fetch + indicator computation across
// hundreds of tickers, and a full scan cycle is necessarily measured in
// days rather than minutes. Each tick processes as many roster symbols as
// fit in TIME_BUDGET_MS, persists progress to Vercel Blob, and picks up
// where it left off next tick — wrapping around to a fresh roster once a
// full cycle completes. Routes read whatever's in `latestBySymbol` at
// request time: a continuously self-refreshing, eventually-consistent view
// rather than an all-or-nothing snapshot.
const BLOB_PATHNAME = "trend-scan/state.json";
const TIME_BUDGET_MS = 8_000; // safety margin under vercel.json's 10s maxDuration (Hobby plan)
const CONCURRENCY = 20;
const ROSTER_SIZE = 350; // most-liquid symbols scanned per cycle — see runScanBatch

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
  // Set only when computeBStarState (bstarScanner.ts) says the symbol is
  // currently inside an open B★ breakout trade AND it passed the CAN SLIM
  // screen — what /bstar-signals shows. Independent of buySignal above:
  // a symbol can carry either, both, or neither at the same time.
  bstarSignal: { buyDate: string; buyPrice: number; signalReturnPercent: number } | null;
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

    const signalDates = latestBuySince(points);
    const bstarState = computeBStarState(points);

    // Only worth the extra financial-report fetch for symbols that already
    // cleared at least one technical condition — keeps the CAN SLIM check
    // from running for every symbol in the roster — and shared between
    // both combos below instead of fetched twice for a symbol that clears
    // both.
    const needsFundamentalsCheck = Boolean(signalDates) || bstarState.isHolding;
    const hasSolidFundamentals = needsFundamentalsCheck ? await checkCanSlimFundamentals(seed.symbol) : false;

    let buySignal: ScannedSymbol["buySignal"] = null;
    if (signalDates && hasSolidFundamentals) {
      buySignal = {
        buyDate: signalDates.buyDate,
        buyPrice: signalDates.buyPrice,
        signalReturnPercent: signalDates.buyPrice
          ? ((last.close - signalDates.buyPrice) / signalDates.buyPrice) * 100
          : 0,
      };
    }

    let bstarSignal: ScannedSymbol["bstarSignal"] = null;
    if (bstarState.isHolding && bstarState.buyDate && bstarState.buyPrice && hasSolidFundamentals) {
      bstarSignal = {
        buyDate: bstarState.buyDate,
        buyPrice: bstarState.buyPrice,
        signalReturnPercent: ((last.close - bstarState.buyPrice) / bstarState.buyPrice) * 100,
      };
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
      bstarSignal,
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
    // Hobby plan's Cron only fires once a day (see vercel.json), so a
    // 1,600-symbol roster would take weeks for one full cycle. Narrowing
    // to the ROSTER_SIZE most liquid tickers (today's price × volume, a
    // proxy for trading value — not a fixed hand-picked list, so it drifts
    // with whatever's actually trading) gets a full cycle down to roughly
    // a week-ish instead, while still covering far more than the old
    // 73-symbol STOCK_UNIVERSE.
    state.roster = [...quotes]
      .filter((q) => q.price > 0 && q.volume > 0)
      .sort((a, b) => b.price * b.volume - a.price * a.volume)
      .slice(0, ROSTER_SIZE)
      .map((q) => ({ symbol: q.symbol, name: q.name, exchange: q.exchange, currency: q.currency }));
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
