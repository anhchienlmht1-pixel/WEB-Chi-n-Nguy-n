import type { FinancialReport } from "../types";

export interface RatioValue {
  value: number;
  unit: string;
}

export interface KeyRatios {
  pe: RatioValue | null;
  roe: RatioValue | null;
}

// KBS doesn't document exact CSTC row IDs, so P/E and ROE are found by name
// match (same approach used elsewhere for KBS reports) — "P/E" and "ROE" are
// kept as literal English abbreviations even in Vietnamese-language ratio
// labels, so a direct substring match is reliable here.
function findLatest(report: FinancialReport, test: (name: string) => boolean): RatioValue | null {
  const lastIdx = report.periods.length - 1;
  if (lastIdx < 0) return null;
  const item = report.items.find(
    (it) => test((it.name || "").toLowerCase()) || test((it.nameEn || "").toLowerCase())
  );
  if (!item) return null;
  const v = item.values[lastIdx];
  if (v == null || !Number.isFinite(v)) return null;
  return { value: v, unit: item.unit ?? "" };
}

export function extractKeyRatios(report: FinancialReport): KeyRatios {
  return {
    pe: findLatest(report, (n) => /p\s*\/\s*e/.test(n)),
    roe: findLatest(report, (n) => n.includes("roe")),
  };
}
