import type { FinancialLineItem, FinancialReport } from "../providers/kbsFinancials.js";

export interface RatioValue {
  value: number;
  unit: string;
}

export interface KeyRatios {
  pe: RatioValue | null;
  pb: RatioValue | null;
  roe: RatioValue | null;
}

// Same name-match approach as the client's extractKeyRatios
// (client/src/utils/ratios.ts) — KBS doesn't document exact CSTC row IDs,
// but "P/E"/"P/B"/"ROE" survive as literal English abbreviations even in
// Vietnamese-language ratio labels, so a substring match is reliable.
const PE_MATCH = (n: string) => /p\s*\/\s*e/.test(n);
const PB_MATCH = (n: string) => /p\s*\/\s*b/.test(n);
const ROE_MATCH = (n: string) => n.includes("roe");

function findRatioItem(report: FinancialReport, test: (name: string) => boolean): FinancialLineItem | null {
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
    pb: findLatest(report, PB_MATCH),
    roe: findLatest(report, ROE_MATCH),
  };
}
