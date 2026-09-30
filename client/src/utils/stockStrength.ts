// Strength bands and colors as shown in the reference sheet's own legend
// ("SM | Chú Thích" table) — copied from there, not invented.
export interface StrengthBand {
  label: string;
  min: number | null;
  max: number | null;
  className: string;
}

export const STRENGTH_BANDS: StrengthBand[] = [
  {
    label: "Yếu",
    min: null,
    max: 400,
    className: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200",
  },
  {
    label: "Trung Bình",
    min: 400,
    max: 500,
    className: "bg-sky-200 text-sky-900 dark:bg-sky-500/30 dark:text-sky-100",
  },
  {
    label: "Khá",
    min: 500,
    max: 550,
    className: "bg-green-200 text-green-900 dark:bg-green-500/25 dark:text-green-200",
  },
  {
    label: "Khỏe",
    min: 550,
    max: 600,
    className: "bg-green-600 text-white dark:bg-green-600 dark:text-white",
  },
  {
    label: "Rất Khỏe",
    min: 600,
    max: null,
    className: "bg-fuchsia-300 text-fuchsia-950 dark:bg-fuchsia-500/40 dark:text-fuchsia-100",
  },
];

export function bandFor(score: number): StrengthBand {
  for (const band of STRENGTH_BANDS) {
    if (band.min !== null && score < band.min) continue;
    if (band.max !== null && score >= band.max) continue;
    return band;
  }
  return STRENGTH_BANDS[STRENGTH_BANDS.length - 1];
}
