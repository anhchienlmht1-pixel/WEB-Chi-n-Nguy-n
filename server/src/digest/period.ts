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

/** The label of the same reporting period one year earlier — "Q2 2026" ->
 * "Q2 2025", bare "2026" -> "2025" — for a "cùng kỳ" (year-over-year)
 * comparison. Null if the label doesn't parse as either shape. */
export function samePeriodLastYearLabel(label: string): string | null {
  const q = label.match(/^Q(\d)\s+(\d{4})$/i);
  if (q) return `Q${q[1]} ${Number(q[2]) - 1}`;
  const y = label.match(/^(\d{4})$/);
  if (y) return String(Number(y[1]) - 1);
  return null;
}
