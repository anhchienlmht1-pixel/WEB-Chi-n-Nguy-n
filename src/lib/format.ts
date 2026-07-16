export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

export function formatChange(value: number): string {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(value: number): string {
  if (!Number.isFinite(value)) return "--";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

export function formatIndexValue(value: number): string {
  if (!Number.isFinite(value)) return "--";
  return value.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Financial ratio APIs (Vietcap included) store percentages as decimals
// (0.18 = 18%), matching the convention already seen in the user's own
// source spreadsheet for the same metrics.
export function formatRatioPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(2)}%`;
}

export function formatRatioNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

export function formatBillionVnd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  return value.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatVndPerShare(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  return Math.round(value).toLocaleString("vi-VN");
}

export function formatGrowthPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}
