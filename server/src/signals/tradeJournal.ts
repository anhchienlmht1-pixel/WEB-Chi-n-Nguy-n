import { put, head } from "@vercel/blob";
import { STOCK_UNIVERSE } from "../providers/universe.js";
import { getHistoryWithFallback } from "../providers/fallback.js";
import { computeSignalSeries, dedupeSameDay, type BarSignal } from "./trendScanner.js";
import { barDateICT, dropUnclosedBars, lastClosedSessionDate } from "./sessionClose.js";
import { getEntryGateData, makeEntryGate } from "./sectorWaves.js";

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

// Bump when the trading rule changes: the next run rebuilds the whole journal
// from JOURNAL_START_DATE under the new rule (forward-only, closed sessions).
//  v2 (18/11/2026): exits only on SMA20 < SMA50 or Supertrend down — ADX ≤ 25
//  alone no longer closes a position (same rule as the chart).
//  v3 (24/11/2026): chỉ mở vị thế mới khi trạng thái thị trường Tích cực và ngành
//  của mã đang có sóng (trang Sóng ngành); điểm bán không đổi.
const RULE_VERSION = 3;

interface JournalState {
  rule?: number;
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

interface SymbolBars {
  name: string;
  exchange: string;
  currency: string;
  /** Closed sessions only, oldest first: Vietnam date, close, buy/sell/neutral. */
  bars: { date: string; close: number; signal: BarSignal }[];
}

interface CurrentSignals {
  symbols: Map<string, SymbolBars>;
  /** Vietnam date (YYYY-MM-DD) of the newest closed bar seen, null if none. */
  dataDate: string | null;
}

// How many recent sessions per symbol are kept for the catch-up replay — more
// than enough to cover days on which nobody opened the site.
const REPLAY_BARS = 90;

async function scanCurrentSignals(): Promise<CurrentSignals> {
  const hits = await mapWithConcurrency(STOCK_UNIVERSE, 20, async (seed) => {
    try {
      const { points: raw } = await getHistoryWithFallback(seed.symbol, "1Y");
      // Closed sessions only — today's bar is dropped until after 15:00 ICT.
      const series = computeSignalSeries(dropUnclosedBars(dedupeSameDay(raw)));
      if (series.length === 0) return null;
      return {
        symbol: seed.symbol,
        name: seed.name,
        exchange: seed.exchange,
        currency: seed.currency,
        bars: series
          .slice(-REPLAY_BARS)
          .flatMap((b) => {
            const date = barDateICT(b.time);
            return date ? [{ date, close: b.close, signal: b.signal }] : [];
          }),
      };
    } catch {
      // A single symbol's data being unavailable for today's run must not
      // block the rest of the scan — its open position (if any) is kept as is.
      return null;
    }
  });

  const symbols = new Map<string, SymbolBars>();
  let dataDate: string | null = null;
  for (const h of hits) {
    if (!h) continue;
    symbols.set(h.symbol, { name: h.name, exchange: h.exchange, currency: h.currency, bars: h.bars });
    const last = h.bars[h.bars.length - 1]?.date;
    if (last && (!dataDate || last > dataDate)) dataDate = last;
  }
  return { symbols, dataDate };
}

// Brings the journal up to date with every CLOSED session since the last run
// (not just the latest one — days on which nobody opened the site are
// replayed bar by bar, so a short MUA→BÁN cycle in between isn't lost) and
// persists the result. Same rule as the chart: open on a MUA bar when flat,
// close on a BÁN bar (SMA20 < SMA50 or Supertrend down); neutral bars hold.
// buyDate / sellDate / lastRunDate are that session's Vietnam date.
async function updateTradeJournal(): Promise<JournalState> {
  const saved = await readState();
  const rebuild = saved.rule !== RULE_VERSION;
  const state: JournalState = rebuild ? { rule: RULE_VERSION, lastRunDate: null, open: [], closed: [] } : saved;
  const expected = lastClosedSessionDate();
  if (expected < JOURNAL_START_DATE) return saved;
  if (!rebuild && state.lastRunDate !== null && state.lastRunDate >= expected) return saved;
  if (Date.now() - lastAttemptMs < RETRY_AFTER_MS) return saved;
  lastAttemptMs = Date.now();

  const gateData = await getEntryGateData();
  if (!gateData) return saved; // chưa có dữ liệu sóng ngành: chưa kết luận, thử lại sau
  const gate = makeEntryGate(gateData);
  const { symbols, dataDate } = await scanCurrentSignals();
  if (symbols.size === 0 || dataDate === null) return saved; // scan failed entirely — don't touch positions on bad data
  // The closed session's bar isn't published yet (provider lag) or it was a
  // holiday — nothing new to conclude; try again later.
  if (dataDate < expected) return saved;

  // Sessions to replay: a rebuild covers every session since JOURNAL_START_DATE;
  // otherwise every session after the last run.
  const inWindow = (d: string) =>
    rebuild ? d >= JOURNAL_START_DATE && d <= dataDate : d > (state.lastRunDate ?? dataDate) && d <= dataDate;

  const openBySymbol = new Map(state.open.map((p) => [p.symbol, p]));
  const nextOpen: JournalPosition[] = [];
  const newlyClosed: JournalClosedTrade[] = [];

  // Open positions whose data is missing this run are kept untouched.
  for (const pos of state.open) if (!symbols.has(pos.symbol)) nextOpen.push(pos);

  for (const [symbol, info] of symbols) {
    let pos: JournalPosition | null = openBySymbol.get(symbol) ?? null;
    for (const bar of info.bars) {
      if (!inWindow(bar.date)) continue;
      if (pos && bar.signal === "sell") {
        newlyClosed.push({
          ...pos,
          sellDate: bar.date,
          sellPrice: bar.close,
          returnPercent: ((bar.close - pos.buyPrice) / pos.buyPrice) * 100,
          holdingDays: Math.round((new Date(bar.date).getTime() - new Date(pos.buyDate).getTime()) / 86_400_000),
        });
        pos = null;
      } else if (!pos && bar.signal === "buy" && gate(symbol, bar.date)) {
        pos = { symbol, name: info.name, exchange: info.exchange, currency: info.currency, buyDate: bar.date, buyPrice: bar.close };
      }
    }
    if (pos) nextOpen.push(pos);
  }

  newlyClosed.sort((a, b) => (a.sellDate < b.sellDate ? 1 : a.sellDate > b.sellDate ? -1 : 0));
  const next: JournalState = {
    rule: RULE_VERSION,
    lastRunDate: dataDate,
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
