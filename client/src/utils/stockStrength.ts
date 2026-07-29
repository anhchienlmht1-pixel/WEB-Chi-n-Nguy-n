// Strength bands and colors as shown in the reference sheet's own legend
// ("SM | Chú Thích" table) — copied from there, not invented.
export interface StrengthBand {
  label: string;
  min: number | null;
  max: number | null;
  className: string;
}

export const STRENGTH_BANDS: StrengthBand[] = [
  { label: "Yếu", min: null, max: 400, className: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300" },
  {
    label: "Trung Bình",
    min: 400,
    max: 500,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    label: "Khá",
    min: 500,
    max: 550,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  {
    label: "Khỏe",
    min: 550,
    max: 600,
    className: "bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-950",
  },
  {
    label: "Rất Khỏe",
    min: 600,
    max: null,
    className: "bg-fuchsia-200 text-fuchsia-900 dark:bg-fuchsia-500/30 dark:text-fuchsia-200",
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
