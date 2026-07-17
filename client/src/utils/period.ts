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
