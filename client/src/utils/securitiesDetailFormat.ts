export type SecuritiesMetricFormat = "percent" | "money" | "perShare";

export function formatDetailValue(v: number, format: SecuritiesMetricFormat): string {
  if (format === "percent") return `${(v * 100).toFixed(1)}%`;
  if (format === "perShare") return v.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
  return v.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
}

export function formatDetailTooltip(v: number, format: SecuritiesMetricFormat): string {
  if (format === "percent") return `${(v * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
  if (format === "perShare") return `${v.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ`;
  return `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
}
