import type { FinancialReport } from "../types";

export interface PeEpsPoint {
  symbol: string;
  pe: number;
  epsGrowthPercent: number;
}

function norm(s: string | undefined): string {
  return (s ?? "").toLowerCase();
}

function findIndex(names: string[], test: (name: string) => boolean): number {
  return names.findIndex(test);
}

/**
 * Pulls a P/E value and an EPS growth % out of a KBS "CSTC" (ratios) report
 * for one symbol. KBS's exact row-name wording isn't documented, so this
 * matches by substring (P/E and EPS row labels are fairly stable across
 * Vietnamese finance sources) instead of an exact key — same defensive
 * approach used for KBS section matching in kbsFinancials.ts. Returns null
 * if the report doesn't contain enough to plot a point for this symbol.
 */
export function extractPeEpsGrowth(symbol: string, report: FinancialReport): PeEpsPoint | null {
  if (report.periods.length === 0) return null;
  const lastIdx = report.periods.length - 1; // KBS returns oldest-first

  const names = report.items.map((it) => norm(it.name) || norm(it.nameEn));

  const peIdx = findIndex(names, (n) => /p\s*\/\s*e/.test(n));
  if (peIdx === -1) return null;
  const pe = report.items[peIdx].values[lastIdx];
  if (pe == null || !Number.isFinite(pe) || pe <= 0) return null;

  const growthIdx = findIndex(names, (n) => n.includes("eps") && (n.includes("tăng trưởng") || n.includes("growth")));
  if (growthIdx !== -1) {
    const g = report.items[growthIdx].values[lastIdx];
    if (g != null && Number.isFinite(g)) return { symbol, pe, epsGrowthPercent: g };
  }

  // No direct "EPS growth" row — derive it from two periods of a plain EPS row.
  const epsIdx = findIndex(names, (n) => n.includes("eps") && !n.includes("tăng trưởng") && !n.includes("growth"));
  if (epsIdx !== -1 && lastIdx >= 1) {
    const cur = report.items[epsIdx].values[lastIdx];
    const prev = report.items[epsIdx].values[lastIdx - 1];
    if (cur != null && prev != null && prev !== 0 && Number.isFinite(cur) && Number.isFinite(prev)) {
      return { symbol, pe, epsGrowthPercent: ((cur - prev) / Math.abs(prev)) * 100 };
    }
  }

  return null;
}

/** First ~40 item names from a report, for diagnostics when nothing matches. */
export function sampleItemNames(report: FinancialReport): string[] {
  return report.items.map((it) => it.name).filter(Boolean).slice(0, 40);
}
