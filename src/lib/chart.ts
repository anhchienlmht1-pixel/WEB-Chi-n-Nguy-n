// Shared helpers for the small SVG charts under the financial-report tables
// (ProfitChart, RatioTrendChart). Kept separate from lightweight-charts —
// these axes are categorical (period labels), not real time series, so the
// full charting library would be overkill.

/** Rounds `range` up to a "nice" 1/2/5×10^n step, d3-style. */
function niceNumber(range: number, round: boolean): number {
  if (range === 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

export interface NiceTicks {
  min: number;
  max: number;
  ticks: number[];
}

/** Clean, evenly-spaced axis ticks spanning at least [min, max]. */
export function niceTicks(min: number, max: number, tickCount = 4): NiceTicks {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const step = niceNumber((max - min) / Math.max(1, tickCount - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { min: niceMin, max: niceMax, ticks };
}

/** Compact axis-tick label, e.g. 12500 -> "12,5K". */
export function formatCompact(value: number): string {
  return value.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
}
