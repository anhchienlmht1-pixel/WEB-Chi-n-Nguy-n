import type { FinancialLineItem, FinancialPeriodType, FinancialReport } from "../types";

// KBS doesn't document exact KQKD row IDs, so the net-profit line is found
// by name match — prefer the top-level (least indented) row when several
// "lợi nhuận sau thuế" rows exist (e.g. consolidated vs. parent-company-only).
export function findProfitItem(report: FinancialReport): FinancialLineItem | null {
  const candidates = report.items.filter((it) => /lợi nhuận sau thuế/i.test(it.name));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}

// Requires the "tổng (cộng) tài sản" prefix so this doesn't match subtotal
// rows like "Tài sản ngắn hạn" / "Tài sản dài hạn", which contain "tài sản"
// but aren't the balance-sheet total.
export function findTotalAssetsItem(report: FinancialReport): FinancialLineItem | null {
  const candidates = report.items.filter((it) => /tổng\s*(cộng\s*)?tài sản/i.test(it.name));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}

export type GrowthMode = "qoq" | "yoy";

/**
 * % growth vs. an earlier period `offset` columns back — offset 1 is
 * period-over-period (QoQ for quarterly data, already YoY for yearly data);
 * offset 4 is year-over-year for quarterly data (same quarter, 4 columns
 * back). Null wherever either side is missing or the base is zero.
 */
export function periodGrowth(values: (number | null)[], offset = 1): (number | null)[] {
  return values.map((v, i) => {
    if (i < offset) return null;
    const prev = values[i - offset];
    if (v == null || prev == null || prev === 0) return null;
    return ((v - prev) / Math.abs(prev)) * 100;
  });
}

/** YoY only makes sense as its own thing on quarterly data — on yearly data every period *is* a year, so offset 1 already means YoY. */
export function growthOffset(periodType: FinancialPeriodType, mode: GrowthMode): number {
  return periodType === "quarter" && mode === "yoy" ? 4 : 1;
}
