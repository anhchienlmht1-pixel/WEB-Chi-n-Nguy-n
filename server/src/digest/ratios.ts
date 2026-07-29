import type { FinancialLineItem, FinancialReport } from "../providers/kbsFinancials.js";
import { sortPeriodIndices } from "./period.js";

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
// Vietnamese-language ratio labels, so a name match is reliable. Word
// boundary (not substring) for ROE — KBS's CSTC report can carry both
// "ROE" and a distinct "ROEA" (average) row, and .includes("roe") would
// match whichever happened to come first in the response.
const PE_MATCH = (n: string) => /p\s*\/\s*e/.test(n);
const PB_MATCH = (n: string) => /p\s*\/\s*b/.test(n);
const ROE_MATCH = (n: string) => /\broe\b/.test(n);

function findRatioItem(report: FinancialReport, test: (name: string) => boolean): FinancialLineItem | null {
  return (
    report.items.find((it) => test((it.name || "").toLowerCase()) || test((it.nameEn || "").toLowerCase())) ?? null
  );
}

// KBS's raw period array isn't guaranteed to be oldest-first, so "latest"
// is resolved by parsing the period labels (sortPeriodIndices) instead of
// trusting periods[periods.length - 1] — that naive assumption was the
// actual bug behind a wrong ROE value showing up for VIC.
function findLatest(report: FinancialReport, test: (name: string) => boolean): RatioValue | null {
  const order = sortPeriodIndices(report.periods, "asc");
  const latestIdx = order[order.length - 1];
  if (latestIdx === undefined) return null;
  const item = findRatioItem(report, test);
  if (!item) return null;
  const v = item.values[latestIdx];
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
