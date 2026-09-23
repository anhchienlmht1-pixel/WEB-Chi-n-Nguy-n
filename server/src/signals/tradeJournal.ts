import { put, head } from "@vercel/blob";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { computeBuySeries, dedupeSameDay } from "./trendScanner.js";

// Real, forward-only trade log for "Lịch sử giao dịch" — unlike
// scanClosedTrades (a backtest that reconstructs every historical
// buy→sell cycle from raw price history), this only ever records what
// the system's own Mua/Bán combo (SMA20 > SMA50, ADX(14) > 25,
// Supertrend(10,3)) actually signals from this date onward, so the
// numbers can't be accused of being cherry-picked in hindsight.
export const JOURNAL_START_DATE = "2026-09-24";

const BLOB_PATHNAME = "trade-journal/state.json";

export interface JournalPosition {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  buyDate: string;
  buyPrice: number;
}

export interface JournalClosedTrade extends JournalPosition {
  sellDate: string;
  sellPrice: number;
  returnPercent: number;
  holdingDays: number;
}

interface JournalState {
  lastRunDate: string | null;
  open: JournalPosition[];
  closed: JournalClosedTrade[];
}

const EMPTY_STATE: JournalState = { lastRunDate: null, open: [], closed: [] };
// Keep the persisted log from growing forever — plenty for "lịch sử gần đây".
const MAX_CLOSED_ENTRIES = 200;

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readState(): Promise<JournalState> {
  if (!blobConfigured()) return EMPTY_STATE;
  try {
    const meta = await head(BLOB_PATHNAME);
    const res = await fetch(meta.url);
    if (!res.ok) return EMPTY_STATE;
    return (await res.json()) as JournalState;
  } catch {
    // Blob not created yet (first run ever) or a transient error — either
    // way, start from an empty journal instead of throwing.
    return EMPTY_STATE;
  }
}

async function writeState(state: JournalState): Promise<void> {
  if (!blobConfigured()) return;
  await put(BLOB_PATHNAME, JSON.stringify(state), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface CurrentSignal {
  isBuy: boolean;
  price: number;
}

async function scanCurrentSignals(): Promise<Map<string, CurrentSignal>> {
  const hits = await mapWithConcurrency(STOCK_UNIVERSE, 20, async (seed) => {
    try {
      const { points: raw } = await getHistoryWithFallback(seed.symbol, "1Y");
      const series = computeBuySeries(dedupeSameDay(raw));
      const last = series[series.length - 1];
      if (!last) return null;
      return { symbol: seed.symbol, isBuy: last.isBuy, price: last.close };
    } catch {
      // A single symbol's data being unavailable for today's run must not
      // block the rest of the scan — see the loop below, which also keeps
      // any already-open position untouched rather than risk a false close.
      return null;
    }
  });

  const map = new Map<string, CurrentSignal>();
  for (const h of hits) if (h) map.set(h.symbol, { isBuy: h.isBuy, price: h.price });
  return map;
}

// Brings the journal up to date with today's signals (at most once per
// calendar day — see the lastRunDate guard) and persists the result.
async function updateTradeJournal(): Promise<JournalState> {
  const state = await readState();
  const today = todayKey();
  if (today < JOURNAL_START_DATE) return state;
  if (state.lastRunDate === today) return state;

  const signals = await scanCurrentSignals();
  if (signals.size === 0) return state; // scan failed entirely — don't touch positions on bad data

  const openBySymbol = new Map(state.open.map((p) => [p.symbol, p]));
  const nextOpen: JournalPosition[] = [];
  const newlyClosed: JournalClosedTrade[] = [];

  for (const pos of state.open) {
    const sig = signals.get(pos.symbol);
    if (!sig || sig.isBuy) {
      // Missing today (fetch failed) or still buying — keep it open.
      nextOpen.push(pos);
      continue;
    }
    const holdingDays = Math.round((new Date(today).getTime() - new Date(pos.buyDate).getTime()) / 86_400_000);
    newlyClosed.push({
      ...pos,
      sellDate: today,
      sellPrice: sig.price,
      returnPercent: ((sig.price - pos.buyPrice) / pos.buyPrice) * 100,
      holdingDays,
    });
  }

  for (const seed of STOCK_UNIVERSE) {
    if (openBySymbol.has(seed.symbol)) continue;
    const sig = signals.get(seed.symbol);
    if (sig?.isBuy) {
      nextOpen.push({
        symbol: seed.symbol,
        name: seed.name,
        exchange: seed.exchange,
        currency: seed.currency,
        buyDate: today,
        buyPrice: sig.price,
      });
    }
  }

  const next: JournalState = {
    lastRunDate: today,
    open: nextOpen,
    closed: [...newlyClosed, ...state.closed].slice(0, MAX_CLOSED_ENTRIES),
  };
  await writeState(next);
  return next;
}

export interface TradeJournal {
  startDate: string;
  open: JournalPosition[];
  closed: JournalClosedTrade[];
}

export async function getTradeJournal(): Promise<TradeJournal> {
  const state = await updateTradeJournal();
  return { startDate: JOURNAL_START_DATE, open: state.open, closed: state.closed };
}
