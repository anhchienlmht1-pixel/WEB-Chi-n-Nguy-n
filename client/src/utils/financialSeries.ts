import type { FinancialLineItem, FinancialReport } from "../types";
import { sortPeriodIndices } from "./period";
import { PE_MATCH, PB_MATCH, ROE_MATCH } from "./ratios";

function findItem(report: FinancialReport, test: (name: string) => boolean): FinancialLineItem | null {
  return report.items.find((it) => test((it.name || "").toLowerCase()) || test((it.nameEn || "").toLowerCase())) ?? null;
}

// KQKD's exact revenue row name varies by source (vndirect/kbs/vci/cafef),
// so this is a best-effort name match rather than a fixed row id — same
// approach server/src/signals/trendScanner.ts's checkCanSlimFundamentals
// already uses for the same report type.
function pickRevenueItem(report: FinancialReport): FinancialLineItem | null {
  return (
    findItem(report, (n) => /doanh thu thuần/.test(n)) ??
    findItem(report, (n) => /doanh thu/.test(n) && !/tài chính|khác/.test(n)) ??
    findItem(report, (n) => /doanh thu|revenue/.test(n))
  );
}

function pickNetProfitItem(report: FinancialReport): FinancialLineItem | null {
  return (
    findItem(report, (n) => /lợi nhuận sau thuế/.test(n) && /cổ đông|công ty mẹ/.test(n)) ??
    findItem(report, (n) => /lợi nhuận sau thuế/.test(n)) ??
    findItem(report, (n) => /(lợi nhuận|net income|net profit)/.test(n) && !/trước thuế/.test(n))
  );
}

// Report values sometimes come back as raw VND, sometimes already in tỷ
// đồng, depending on source — normalize by magnitude/unit rather than
// trusting one convention, since guessing wrong silently inflates the
// chart by 1,000x.
function toBillions(value: number, unit: string): number {
  if (/tỷ/i.test(unit)) return value;
  if (/triệu/i.test(unit)) return value / 1_000;
  return value / 1_000_000_000;
}

export interface QuarterRow {
  label: string;
  revenueBn: number | null;
  netProfitBn: number | null;
  roe: number | null;
  pe: number | null;
  pb: number | null;
  yoyRevenuePct: number | null;
  yoyProfitPct: number | null;
}

// Aligns KQKD (revenue/profit) and CSTC (ROE/P/E/P/B) quarterly reports —
// which race independently server-side and can come back with different
// period coverage — onto one chronological timeline by period LABEL
// ("Q2 2026"), not by array index, then computes YoY (same quarter, 4
// quarters back) over the FULL history before trimming to the requested
// window, so the earliest displayed quarters still get a real YoY figure
// instead of an artificial gap.
export function buildQuarterlySeries(kqkd: FinancialReport, cstc: FinancialReport, windowSize = 12): QuarterRow[] {
  const revenueItem = pickRevenueItem(kqkd);
  const profitItem = pickNetProfitItem(kqkd);
  const roeItem = findItem(cstc, ROE_MATCH);
  const peItem = findItem(cstc, PE_MATCH);
  const pbItem = findItem(cstc, PB_MATCH);

  const allLabels = Array.from(new Set([...kqkd.periods, ...cstc.periods]));
  const order = sortPeriodIndices(allLabels, "asc");
  const timeline = order.map((i) => allLabels[i]);

  const kqkdIndex = new Map(kqkd.periods.map((p, i) => [p, i]));
  const cstcIndex = new Map(cstc.periods.map((p, i) => [p, i]));

  function kqkdValue(item: FinancialLineItem | null, label: string): number | null {
    const idx = kqkdIndex.get(label);
    if (!item || idx === undefined) return null;
    const v = item.values[idx];
    return v == null || !Number.isFinite(v) ? null : toBillions(v, item.unit ?? "");
  }

  function cstcValue(item: FinancialLineItem | null, label: string): number | null {
    const idx = cstcIndex.get(label);
    if (!item || idx === undefined) return null;
    const v = item.values[idx];
    return v == null || !Number.isFinite(v) ? null : v;
  }

  const revenue = timeline.map((l) => kqkdValue(revenueItem, l));
  const profit = timeline.map((l) => kqkdValue(profitItem, l));

  function yoy(series: (number | null)[], i: number): number | null {
    const prev = series[i - 4];
    const cur = series[i];
    if (prev == null || cur == null || prev === 0) return null;
    return ((cur - prev) / Math.abs(prev)) * 100;
  }

  const rows: QuarterRow[] = timeline.map((label, i) => ({
    label,
    revenueBn: revenue[i],
    netProfitBn: profit[i],
    roe: cstcValue(roeItem, label),
    pe: cstcValue(peItem, label),
    pb: cstcValue(pbItem, label),
    yoyRevenuePct: yoy(revenue, i),
    yoyProfitPct: yoy(profit, i),
  }));

  return rows.slice(-windowSize);
}

export function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function last<T>(values: T[]): T | undefined {
  return values[values.length - 1];
}
