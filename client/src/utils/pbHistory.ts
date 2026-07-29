import type { PbHistoryTable } from "../api/client";

export type PbLookbackYears = 1 | 3 | 5;

export interface PbStat {
  symbol: string;
  current: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
}

// P/B history rows now carry fiscal-period labels from VCI's ratio endpoint
// ("Q1 2024" or, for annual-only rows, "2024") rather than the old sheet's
// daily "dd/MM/yyyy" — each quarter is mapped to its fiscal quarter-end
// date (annual rows to year-end) so the lookback-window math below (which
// just compares real Date objects) keeps working unchanged.
const QUARTER_END_MONTH_DAY: Record<number, [number, number]> = {
  1: [2, 31], // March (0-indexed month 2), 31st
  2: [5, 30],
  3: [8, 30],
  4: [11, 31],
};

function parseVnDate(s: string): Date | null {
  const q = /^Q(\d)\s+(\d{4})$/.exec(s.trim());
  if (q) {
    const [month, day] = QUARTER_END_MONTH_DAY[Number(q[1])];
    return new Date(Date.UTC(Number(q[2]), month, day));
  }
  const y = /^(\d{4})$/.exec(s.trim());
  if (y) return new Date(Date.UTC(Number(y[1]), 11, 31));
  return null;
}

function formatVnDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export interface PbDataCoverage {
  earliest: Date;
  latest: Date;
  earliestLabel: string;
  latestLabel: string;
}

// The sheet only has as much history as its owner has entered — a
// lookback window longer than that just returns everything available, so
// e.g. "5 Năm" and "3 Năm" can legitimately show identical results when
// the sheet only has ~3 years of rows. Callers use this to tell that case
// apart from an actual bug, and to say so on the page instead of leaving
// the user to wonder why two windows look the same.
export function getPbDataCoverage(table: PbHistoryTable): PbDataCoverage | null {
  const dates = table.rows.map((r) => parseVnDate(r.date)).filter((d): d is Date => d !== null);
  if (dates.length === 0) return null;
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  return { earliest, latest, earliestLabel: formatVnDate(earliest), latestLabel: formatVnDate(latest) };
}

// True when the selected lookback reaches back further than the sheet's
// own earliest row — i.e. this window can't show anything a shorter one
// (with more data left over) wouldn't already show.
export function pbWindowExceedsCoverage(coverage: PbDataCoverage, years: PbLookbackYears): boolean {
  const since = new Date();
  since.setFullYear(since.getFullYear() - years);
  return since <= coverage.earliest;
}

// current/average/min/max come straight from VCI's own quarterly P/B
// series (real ratio values from the exchange's own reports), not derived
// or approximated here — this just picks out the most recent value and
// folds the window matching the selected lookback into average/min/max.
export function computePbStatsFromHistory(table: PbHistoryTable, years: PbLookbackYears): PbStat[] {
  const parsedRows = table.rows
    .map((r) => ({ date: parseVnDate(r.date), values: r.values }))
    .filter((r): r is { date: Date; values: (number | null)[] } => r.date !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const since = new Date();
  since.setFullYear(since.getFullYear() - years);

  return table.symbols.map((symbol, i) => {
    const current = parsedRows.length > 0 ? parsedRows[0].values[i] : null;
    const series = parsedRows
      .filter((r) => r.date >= since)
      .map((r) => r.values[i])
      .filter((v): v is number => v != null);

    if (series.length === 0) return { symbol, current, average: current, min: current, max: current };
    return {
      symbol,
      current,
      average: series.reduce((a, b) => a + b, 0) / series.length,
      min: Math.min(...series),
      max: Math.max(...series),
    };
  });
}
