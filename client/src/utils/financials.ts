import type { FinancialLineItem, FinancialReport } from "../types";

// KBS doesn't document exact KQKD row IDs, so the net-profit line is found
// by name match — prefer the top-level (least indented) row when several
// "lợi nhuận sau thuế" rows exist (e.g. consolidated vs. parent-company-only).
export function findProfitItem(report: FinancialReport): FinancialLineItem | null {
  const candidates = report.items.filter((it) => /lợi nhuận sau thuế/i.test(it.name));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}

// Prefers "doanh thu thuần" (net revenue, the standard top-line figure)
// over "tổng doanh thu"/"doanh thu bán hàng" variants some report layouts
// use instead, and excludes financial/other income rows that also contain
// "doanh thu" but aren't the operating top line.
export function findRevenueItem(report: FinancialReport): FinancialLineItem | null {
  const candidates = report.items.filter(
    (it) => /doanh thu thuần|doanh thu bán hàng|tổng doanh thu/i.test(it.name) && !/tài chính|khác/i.test(it.name)
  );
  if (candidates.length === 0) return null;
  const netRevenue = candidates.filter((it) => /doanh thu thuần/i.test(it.name));
  const pool = netRevenue.length > 0 ? netRevenue : candidates;
  return [...pool].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}

// Requires the "tổng (cộng) tài sản" prefix so this doesn't match subtotal
// rows like "Tài sản ngắn hạn" / "Tài sản dài hạn", which contain "tài sản"
// but aren't the balance-sheet total.
export function findTotalAssetsItem(report: FinancialReport): FinancialLineItem | null {
  const candidates = report.items.filter((it) => /tổng\s*(cộng\s*)?tài sản/i.test(it.name));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}

// "Nguồn vốn" (funding side of the balance sheet) — shows owners' equity
// specifically rather than "tổng cộng nguồn vốn", which is always
// numerically identical to total assets (assets = liabilities + equity by
// definition) and so wouldn't be a useful second chart next to it.
export function findEquityItem(report: FinancialReport): FinancialLineItem | null {
  const candidates = report.items.filter((it) => /vốn chủ sở hữu/i.test(it.name));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}

export interface FinancialTreeNode {
  item: FinancialLineItem;
  children: FinancialTreeNode[];
}

// KBS's line items are already in outline order (each row immediately
// followed by its own children, one level deeper) — this just turns that
// flat, levels-indented list into an actual parent-child tree so the table
// can render Excel-style collapsible groups (Tài sản > Tài sản hiện hành >
// Tiền mặt/Khoản phải thu/...) instead of only visual indentation.
export function buildFinancialTree(items: FinancialLineItem[]): FinancialTreeNode[] {
  const roots: FinancialTreeNode[] = [];
  const stack: FinancialTreeNode[] = [];

  for (const item of items) {
    const node: FinancialTreeNode = { item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].item.levels >= item.levels) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
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
