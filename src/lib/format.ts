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

// Formats a KBS financial-statement/ratio value. `unit` is the raw unit
// label KBS returns per line item (e.g. "%", "Lần", "VND") — percentages
// and ratios get 2 decimals, everything else (money, already scaled by the
// unit=1000 request param) gets grouped thousands with no forced decimals.
export function formatFinancialValue(value: number | null, unit?: string): string {
  if (value === null || !Number.isFinite(value)) return "--";
  const u = (unit ?? "").trim();
  if (u === "%" || /lần/i.test(u)) {
    return value.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

/** Compact VND amount for large sums, e.g. avg. trading value: 245300000000 -> "245,3 tỷ đ". */
export function formatCompactVnd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 2 })}đ`;
}

export function formatDateTime(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds)) return "--";
  return new Date(unixSeconds * 1000).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
