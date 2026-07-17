import type { FinancialLineItem, FinancialReport } from "../types";

// KBS doesn't document exact KQKD row IDs, so the net-profit line is found
// by name match — prefer the top-level (least indented) row when several
// "lợi nhuận sau thuế" rows exist (e.g. consolidated vs. parent-company-only).
export function findProfitItem(report: FinancialReport): FinancialLineItem | null {
  const candidates = report.items.filter((it) => /lợi nhuận sau thuế/i.test(it.name));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}
