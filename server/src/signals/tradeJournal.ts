import { put, head } from "@vercel/blob";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { computeBuySeries, dedupeSameDay } from "./trendScanner.js";
import { barDateICT, dropUnclosedBars, lastClosedSessionDate } from "./sessionClose.js";

// Real, forward-only trade log for "Lịch sử giao dịch" — unlike
// scanClosedTrades (a backtest that reconstructs every historical
// buy→sell cycle from raw price history), this only ever records what
// the system's own Mua/Bán combo (SMA20 > SMA50, ADX(14) > 25,
// Supertrend(10,3)) actually signals from this date onward, so the
// numbers can't be accused of being cherry-picked in hindsight.
//
// "Chỉ kết luận khi đóng phiên": entries and exits are only ever decided from
// sessions that have already closed (after 15:00 ICT), and are dated with that
// session's Vietnam date — never from a half-formed bar mid-session.
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

// A failed/empty attempt (data for the closed session not published yet, or a
// holiday with no new bar) is retried at most this often, so the journal
// route's short cache can't turn into a full-universe scan every 5 minutes.
const RETRY_AFTER_MS = 15 * 60 * 1000;
let lastAttemptMs = 0;

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
  name: string;
  exchange: string;
  currency: string;
  isBuy: boolean;
  price: number;
}

interface CurrentSignals {
  signals: Map<string, CurrentSignal>;
  /** Vietnam date (YYYY-MM-DD) of the newest closed bar seen, null if none. */
  dataDate: string | null;
}

async function scanCurrentSignals(): Promise<CurrentSignals> {
  const hits = await mapWithConcurrency(STOCK_UNIVERSE, 20, async (seed) => {
    try {
      const { points: raw } = await getHistoryWithFallback(seed.symbol, "1Y");
      // Closed sessions only — today's bar is dropped until after 15:00 ICT.
      const series = computeBuySeries(dropUnclosedBars(dedupeSameDay(raw)));
      const last = series[series.length - 1];
      if (!last) return null;
      return {
        symbol: seed.symbol,
        name: seed.name,
        exchange: seed.exchange,
        currency: seed.currency,
        isBuy: last.isBuy,
        price: last.close,
        barDate: barDateICT(last.time),
      };
    } catch {
      // A single symbol's data being unavailable for today's run must not
      // block the rest of the scan — see the loop below, which also keeps
      // any already-open position untouched rather than risk a false close.
      return null;
    }
  });

  const map = new Map<string, CurrentSignal>();
  let dataDate: string | null = null;
  for (const h of hits) {
    if (!h) continue;
    map.set(h.symbol, { name: h.name, exchange: h.exchange, currency: h.currency, isBuy: h.isBuy, price: h.price });
    if (h.barDate && (!dataDate || h.barDate > dataDate)) dataDate = h.barDate;
  }
  return { signals: map, dataDate };
}

// Brings the journal up to date with the latest CLOSED session's signals (at
// most once per session — see the lastRunDate guard) and persists the result.
// lastRunDate / buyDate / sellDate are all that session's Vietnam date.
async function updateTradeJournal(): Promise<JournalState> {
  const state = await readState();
  const expected = lastClosedSessionDate();
  if (expected < JOURNAL_START_DATE) return state;
  if (state.lastRunDate !== null && state.lastRunDate >= expected) return state;
  if (Date.now() - lastAttemptMs < RETRY_AFTER_MS) return state;
  lastAttemptMs = Date.now();

  const { signals, dataDate } = await scanCurrentSignals();
  if (signals.size === 0 || dataDate === null) return state; // scan failed entirely — don't touch positions on bad data
  // The closed session's bar isn't published yet (provider lag) or it was a
  // holiday — nothing new to conclude; try again later.
  if (dataDate < expected) return state;
  const sessionDate = dataDate;

  const openBySymbol = new Map(state.open.map((p) => [p.symbol, p]));
  const nextOpen: JournalPosition[] = [];
  const newlyClosed: JournalClosedTrade[] = [];

  for (const pos of state.open) {
    const sig = signals.get(pos.symbol);
    if (!sig || sig.isBuy) {
      // Missing in this run (fetch failed) or still buying — keep it open.
      nextOpen.push(pos);
      continue;
    }
    const holdingDays = Math.round((new Date(sessionDate).getTime() - new Date(pos.buyDate).getTime()) / 86_400_000);
    newlyClosed.push({
      ...pos,
      sellDate: sessionDate,
      sellPrice: sig.price,
      returnPercent: ((sig.price - pos.buyPrice) / pos.buyPrice) * 100,
      holdingDays,
    });
  }

  for (const [symbol, sig] of signals) {
    if (openBySymbol.has(symbol) || !sig.isBuy) continue;
    nextOpen.push({
      symbol,
      name: sig.name,
      exchange: sig.exchange,
      currency: sig.currency,
      buyDate: sessionDate,
      buyPrice: sig.price,
    });
  }

  const next: JournalState = {
    lastRunDate: sessionDate,
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
