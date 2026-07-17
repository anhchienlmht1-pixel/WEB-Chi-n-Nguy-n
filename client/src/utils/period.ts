// KBS period labels come as either a bare year ("2020") or "Q<n> <year>"
// for quarters (see server/src/providers/kbsFinancials.ts's periodLabel()).
// We were previously assuming KBS always returns them oldest-first and
// hard-coding a .reverse()/no-op around that guess — a live report showed a
// chart with the timeline backwards, meaning that assumption was wrong. This
// parses the actual year/quarter out of each label instead, so ordering is
// correct regardless of whatever order the raw array happens to be in.
function periodSortKey(label: string): number {
  const q = label.match(/^Q(\d)\s+(\d{4})$/i);
  if (q) return Number(q[2]) * 4 + Number(q[1]);
  const y = label.match(/(\d{4})/);
  if (y) return Number(y[1]) * 4;
  return 0;
}

/** Indices into `periods`, ordered chronologically (oldest first by default). */
export function sortPeriodIndices(periods: string[], direction: "asc" | "desc" = "asc"): number[] {
  const indices = periods.map((_, i) => i);
  indices.sort((a, b) => periodSortKey(periods[a]) - periodSortKey(periods[b]));
  if (direction === "desc") indices.reverse();
  return indices;
}

const QUARTER_END_MONTH_DAY: Record<string, [number, number]> = {
  "1": [2, 31],
  "2": [5, 30],
  "3": [8, 30],
  "4": [11, 31],
};

/**
 * Approximate reporting-period end date for a KBS period label, so a
 * quarterly/yearly financial figure can be lined up against a daily price
 * series. "Q1 2024" -> Mar 31 2024, a bare "2024" -> Dec 31 2024. Returns
 * null for anything that doesn't parse as a period label.
 */
export function periodEndDate(label: string): Date | null {
  const q = label.match(/^Q(\d)\s+(\d{4})$/i);
  if (q) {
    const [month, day] = QUARTER_END_MONTH_DAY[q[1]] ?? [11, 31];
    return new Date(Date.UTC(Number(q[2]), month, day));
  }
  const y = label.match(/^(\d{4})$/);
  if (y) return new Date(Date.UTC(Number(y[1]), 11, 31));
  return null;
}
