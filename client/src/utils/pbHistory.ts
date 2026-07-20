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
