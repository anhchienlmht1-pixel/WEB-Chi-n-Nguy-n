import type { FinancialLineItem, FinancialReport } from "../types";

export interface RatioValue {
  value: number;
  unit: string;
}

export interface KeyRatios {
  pe: RatioValue | null;
  roe: RatioValue | null;
  roa: RatioValue | null;
}

export const PE_MATCH = (n: string) => /p\s*\/\s*e/.test(n);
export const ROE_MATCH = (n: string) => n.includes("roe");
export const ROA_MATCH = (n: string) => n.includes("roa");

// KBS doesn't document exact CSTC row IDs, so P/E and ROE are found by name
// match (same approach used elsewhere for KBS reports) — "P/E" and "ROE" are
// kept as literal English abbreviations even in Vietnamese-language ratio
// labels, so a direct substring match is reliable here.
export function findRatioItem(report: FinancialReport, test: (name: string) => boolean): FinancialLineItem | null {
  return (
    report.items.find((it) => test((it.name || "").toLowerCase()) || test((it.nameEn || "").toLowerCase())) ?? null
  );
}

function findLatest(report: FinancialReport, test: (name: string) => boolean): RatioValue | null {
  const lastIdx = report.periods.length - 1;
  if (lastIdx < 0) return null;
  const item = findRatioItem(report, test);
  if (!item) return null;
  const v = item.values[lastIdx];
  if (v == null || !Number.isFinite(v)) return null;
  return { value: v, unit: item.unit ?? "" };
}

export function extractKeyRatios(report: FinancialReport): KeyRatios {
  return {
    pe: findLatest(report, PE_MATCH),
    roe: findLatest(report, ROE_MATCH),
    roa: findLatest(report, ROA_MATCH),
  };
}
