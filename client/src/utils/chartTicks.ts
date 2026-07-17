// Picks x-axis label indices spaced roughly `step` apart, always including
// the last index — but only as an addition when it's far enough from the
// previous pick, otherwise it replaces it. A naive "every step-th index,
// plus always the last" can put two labels right next to each other when
// n-1 falls just after a regular step tick, which overlaps as illegible text.
export function pickLabelIndices(n: number, step: number): number[] {
  if (n === 0) return [];
  const picked: number[] = [];
  for (let i = 0; i < n; i += step) picked.push(i);
  const last = n - 1;
  const lastPicked = picked[picked.length - 1];
  if (lastPicked !== last) {
    // Only add the last index as an extra label if it's a full step away
    // from the previous one — anything closer and the two labels' text
    // would overlap, so swap it in instead of appending it.
    if (last - lastPicked >= step) picked.push(last);
    else picked[picked.length - 1] = last;
  }
  return picked;
}
