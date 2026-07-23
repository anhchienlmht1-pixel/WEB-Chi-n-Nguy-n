import type { PbHistoryTable } from "../api/client";

export type PbLookbackYears = 1 | 3 | 5;

export interface PbStat {
  symbol: string;
  current: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
}

// dd/MM/yyyy, matching the date format the sheet's P/B history tabs write
// in their first column.
function parseVnDate(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
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

// current/average/min/max come straight from the sheet's own daily P/B
// series (real values the sheet's owner computes there), not derived or
// approximated here — this just picks out the most recent value and folds
// the window matching the selected lookback into average/min/max.
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
