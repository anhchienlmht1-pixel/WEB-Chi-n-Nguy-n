import type { FinancialLineItem, FinancialReport, FinancialSource } from "../types";

const SOURCE_LABEL: Record<FinancialSource, string> = {
  vndirect: "VNDirect",
  kbs: "KBS",
  vci: "VCI",
  cafef: "CafeF",
};

export function financialSourceLabel(source: FinancialSource): string {
  return SOURCE_LABEL[source];
}

// Every non-winning source's outcome is a debugging aid — normally you'd
// only ever see the winner, but a losing source's failure reason is
// exactly what's needed to fix it, and there's no other way to see it
// short of server logs. Shown inline so a screenshot carries it directly.
export function financialSourceCaption(
  report: {
    source?: FinancialSource;
    periods: string[];
    otherSources?: { source: FinancialSource; outcome: string }[];
  },
  prefix = "Nguồn"
): string | null {
  if (!report.source) return null;
  let caption = `${prefix}: ${financialSourceLabel(report.source)} · ${report.periods.length} kỳ`;
  if (report.otherSources && report.otherSources.length > 0) {
    const others = report.otherSources.map((o) => `${financialSourceLabel(o.source)}: ${o.outcome}`).join(" · ");
    caption += ` (khác: ${others})`;
  }
  return caption;
}

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

/**
 * % growth vs. the immediately previous period — period-over-period, which
 * reads as QoQ on a quarterly chart and YoY on a yearly one, matching
 * whichever period type the chart is already showing. Null wherever either
 * side is missing or the base is zero.
 */
export function periodGrowth(values: (number | null)[]): (number | null)[] {
  return values.map((v, i) => {
    if (i === 0) return null;
    const prev = values[i - 1];
    if (v == null || prev == null || prev === 0) return null;
    return ((v - prev) / Math.abs(prev)) * 100;
  });
}
