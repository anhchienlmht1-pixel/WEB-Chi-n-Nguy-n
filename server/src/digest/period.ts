// Server-side mirror of client/src/utils/period.ts's sortPeriodIndices —
// KBS period labels come as either a bare year ("2020") or "Q<n> <year>"
// (see server/src/providers/kbsFinancials.ts's periodLabel()), and the raw
// order KBS returns them in isn't guaranteed to be chronological, so
// "latest" has to be resolved by parsing the label itself rather than
// trusting array position (a live report already caught that exact
// assumption being wrong for a chart's timeline on the client side).
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
