import type { HistoryPoint, Quote } from "../types";
import type { BankData } from "../types/bank";

// The 16 banks shown in the "So sánh P/B ngành ngân hàng" chart — a subset
// of the full 27-bank list (BANK_SYMBOL_LIST), matching the more liquid /
// widely-tracked names.
export const PB_COMPARE_SYMBOLS = [
  "VCB", "BID", "CTG", "TCB", "VPB", "MBB", "ACB", "LPB",
  "HDB", "STB", "VIB", "TPB", "EIB", "SHB", "MSB", "OCB",
];

export type PbLookbackYears = 1 | 3 | 5;

export interface BankPbStat {
  symbol: string;
  current: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
}

// Quarter-end date for a period label like "Q1 2026" — used to forward-fill
// the most recently reported equity onto later trading dates that don't
// have a newer quarterly report yet.
function quarterEndDate(period: string): Date | null {
  const m = period.match(/Q([1-4])\s*(\d{4})/i);
  if (!m) return null;
  const quarter = Number(m[1]);
  const year = Number(m[2]);
  return new Date(Date.UTC(year, quarter * 3, 0)); // day 0 of the month after = last day of the quarter's last month
}

function buildEquityLookup(bank: BankData): { date: Date; equity: number }[] {
  const { periods, metrics } = bank.quarter;
  const list: { date: Date; equity: number }[] = [];
  periods.forEach((p, i) => {
    const equity = metrics.equity[i];
    const date = quarterEndDate(p);
    if (date && equity !== null && Number.isFinite(equity)) list.push({ date, equity });
  });
  list.sort((a, b) => a.date.getTime() - b.date.getTime());
  return list;
}

function equityAsOf(lookup: { date: Date; equity: number }[], date: Date): number | null {
  let result: number | null = null;
  for (const entry of lookup) {
    if (entry.date.getTime() > date.getTime()) break;
    result = entry.equity;
  }
  return result;
}

// Builds current/average/min/max P/B for one bank from real data: the
// quote's live market cap, the bank's real quarterly equity series, and
// real historical closing prices. The one approximation is applying
// today's share count to past dates when converting price -> market cap
// (there is no historical shares-outstanding series available), which
// under- or overstates historical P/B for any bank that issued a
// meaningful number of new shares within the lookback window.
export function computeBankPbStat(
  quote: Quote,
  bank: BankData,
  history: HistoryPoint[],
  sinceDate: Date
): BankPbStat {
  const symbol = quote.symbol;
  if (!quote.marketCap || !quote.price) {
    return { symbol, current: null, average: null, min: null, max: null };
  }

  const currentShares = quote.marketCap / quote.price;
  const equityLookup = buildEquityLookup(bank);
  const latestEquity = equityLookup.at(-1)?.equity ?? null;
  const current = latestEquity ? quote.marketCap / (latestEquity * 1e9) : null;

  const series: number[] = [];
  for (const point of history) {
    const date = new Date(point.time);
    if (date < sinceDate || !point.close) continue;
    const equity = equityAsOf(equityLookup, date);
    if (!equity) continue;
    series.push((point.close * currentShares) / (equity * 1e9));
  }

  if (series.length === 0) return { symbol, current, average: current, min: current, max: current };
  return {
    symbol,
    current,
    average: series.reduce((a, b) => a + b, 0) / series.length,
    min: Math.min(...series),
    max: Math.max(...series),
  };
}
