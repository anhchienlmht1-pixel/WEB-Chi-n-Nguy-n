import type { FinancialLineItem, FinancialReport } from "../types";
import { sortPeriodIndices } from "./period";

export interface RatioValue {
  value: number;
  unit: string;
}

export interface KeyRatios {
  pe: RatioValue | null;
  pb: RatioValue | null;
  roe: RatioValue | null;
  roa: RatioValue | null;
}

export const PE_MATCH = (n: string) => /p\s*\/\s*e/.test(n);
export const PB_MATCH = (n: string) => /p\s*\/\s*b/.test(n);
// Word-boundary, not substring — KBS's CSTC report can carry both "ROE" and
// a distinct "ROEA" (average) row, and a bare .includes("roe") would match
// either one depending on which happens to come first in the response.
export const ROE_MATCH = (n: string) => /\broe\b/.test(n);
export const ROA_MATCH = (n: string) => /\broa\b/.test(n);

// KBS doesn't document exact CSTC row IDs, so P/E and ROE are found by name
// match (same approach used elsewhere for KBS reports) — "P/E" and "ROE" are
// kept as literal English abbreviations even in Vietnamese-language ratio
// labels, so a direct substring match is reliable here.
export function findRatioItem(report: FinancialReport, test: (name: string) => boolean): FinancialLineItem | null {
  return (
    report.items.find((it) => test((it.name || "").toLowerCase()) || test((it.nameEn || "").toLowerCase())) ?? null
  );
}

// KBS's raw period array isn't guaranteed to be oldest-first (see period.ts
// — a live report already caught this exact assumption being wrong for a
// chart's timeline), so "latest" has to be resolved by actually parsing the
// period labels rather than trusting periods[periods.length - 1].
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
    roa: findLatest(report, ROA_MATCH),
  };
}
