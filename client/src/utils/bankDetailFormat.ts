export type BankMetricFormat = "percent" | "money";

export function formatDetailValue(v: number, format: BankMetricFormat): string {
  if (format === "percent") return `${(v * 100).toFixed(1)}%`;
  return v.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
}

export function formatDetailTooltip(v: number, format: BankMetricFormat): string {
  if (format === "percent") return `${(v * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
  return `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
}
