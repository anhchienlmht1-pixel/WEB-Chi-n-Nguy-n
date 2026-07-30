import type { FinancialLineItem, FinancialReport } from "../providers/kbsFinancials.js";
import { samePeriodLastYearLabel, sortPeriodIndices } from "./period.js";
import type { FundamentalMetric } from "./marketDigest.js";

// KBS doesn't document exact KQKD row IDs, so revenue/profit lines are
// found by name match — same approach and "prefer least-indented" tie-break
// as client/src/utils/financials.ts's findProfitItem (several "lợi nhuận
// sau thuế"/"doanh thu" rows can exist for consolidated vs. parent-company-
// only reporting; the top-level one is the one worth quoting).
function pickTopLevel(items: FinancialLineItem[]): FinancialLineItem | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}

export function findProfitItem(report: FinancialReport): FinancialLineItem | null {
  return pickTopLevel(report.items.filter((it) => /lợi nhuận sau thuế/i.test(it.name)));
}

export function findRevenueItem(report: FinancialReport): FinancialLineItem | null {
  const netRevenue = report.items.filter((it) => /doanh thu thuần/i.test(it.name));
  if (netRevenue.length > 0) return pickTopLevel(netRevenue);
  return pickTopLevel(report.items.filter((it) => /^(tổng\s+)?doanh thu/i.test(it.name.trim())));
}

function growthPercent(current: number, prior: number | null | undefined): number | null {
  if (prior == null || !Number.isFinite(prior) || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

/** The most recent period's value for `item`, plus QoQ and YoY growth —
 * "latest" resolved by parsing period labels (sortPeriodIndices), not by
 * trusting array position (see period.ts's history comment for why that
 * assumption already broke a chart's timeline once before). */
export function latestPeriodMetric(report: FinancialReport, item: FinancialLineItem): FundamentalMetric | null {
  const order = sortPeriodIndices(report.periods, "asc");
  if (order.length === 0) return null;

  const latestIdx = order[order.length - 1];
  const value = item.values[latestIdx];
  if (value == null || !Number.isFinite(value)) return null;
  const periodLabel = report.periods[latestIdx];

  const prevIdx = order.length >= 2 ? order[order.length - 2] : undefined;
  const qoqGrowthPercent = prevIdx !== undefined ? growthPercent(value, item.values[prevIdx]) : null;

  const yoyLabel = samePeriodLastYearLabel(periodLabel);
  const yoyIdx = yoyLabel !== null ? report.periods.indexOf(yoyLabel) : -1;
  const yoyGrowthPercent = yoyIdx >= 0 ? growthPercent(value, item.values[yoyIdx]) : null;

  return { periodLabel, value, unit: item.unit ?? "", qoqGrowthPercent, yoyGrowthPercent };
}
