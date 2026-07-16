import "server-only";
import { RatioPoint } from "./types";
import { RATIO_FIELDS } from "./ratioFields";

// Vietcap's research/insight API (iq.vietcap.com.vn) — same brokerage as
// the trading.vietcap.com.vn price data already used elsewhere, exposing a
// financial-ratio endpoint per company (ROE, ROA, NIM, NPL, CASA, LDR,
// CIR, credit/deposit growth, etc.) that the vnstock community library
// reads from too. Unofficial/reverse-engineered — no API key, so treat it
// as best-effort with defensive parsing and a clear error on failure.
const RATIO_URL = (symbol: string) =>
  `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/${encodeURIComponent(symbol)}/statistics-financial`;

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://trading.vietcap.com.vn/",
  Origin: "https://trading.vietcap.com.vn",
};

interface RawRatioRow {
  [key: string]: unknown;
}

function extractPeriodLabel(
  row: RawRatioRow
): { period: string; periodType: "quarter" | "year"; sortKey: number } | null {
  const year = row.year ?? row.yearReport ?? row.reportYear;
  const quarter = row.quarter ?? row.quarterReport ?? row.reportQuarter;
  const reportPeriod = row.report_period ?? row.reportPeriod;

  if (typeof year === "number" && typeof quarter === "number" && quarter >= 1 && quarter <= 4) {
    return { period: `Q${quarter} ${year}`, periodType: "quarter", sortKey: year * 10 + quarter };
  }
  if (typeof year === "number") {
    return { period: String(year), periodType: "year", sortKey: year * 10 };
  }
  if (typeof reportPeriod === "string") {
    const yearNum = Number(reportPeriod.match(/\d{4}/)?.[0]);
    const quarterNum = Number(reportPeriod.match(/Q(\d)/i)?.[1]);
    const isQuarter = reportPeriod.toUpperCase().includes("Q") && Number.isFinite(quarterNum);
    return {
      period: reportPeriod,
      periodType: isQuarter ? "quarter" : "year",
      sortKey: Number.isFinite(yearNum) ? yearNum * 10 + (isQuarter ? quarterNum : 0) : 0,
    };
  }
  return null;
}

function toRatioPoint(row: RawRatioRow): (RatioPoint & { sortKey: number }) | null {
  const periodInfo = extractPeriodLabel(row);
  if (!periodInfo) return null;

  const values: Record<string, number | null> = {};
  for (const field of RATIO_FIELDS) {
    const raw = row[field.key];
    values[field.key] = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  }

  return { period: periodInfo.period, periodType: periodInfo.periodType, values, sortKey: periodInfo.sortKey };
}

/**
 * Response shape isn't documented anywhere public — try the plausible
 * variants (bare array, {data: [...]}, {quarters: [...], years: [...]}) and
 * take whichever actually has rows, rather than assuming one exact shape.
 */
function extractRows(json: unknown): RawRatioRow[] {
  if (Array.isArray(json)) return json as RawRatioRow[];
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as RawRatioRow[];
    const combined = [
      ...(Array.isArray(obj.quarters) ? (obj.quarters as RawRatioRow[]) : []),
      ...(Array.isArray(obj.years) ? (obj.years as RawRatioRow[]) : []),
    ];
    if (combined.length > 0) return combined;
  }
  return [];
}

export async function fetchVciRatios(symbol: string): Promise<RatioPoint[]> {
  const res = await fetch(RATIO_URL(symbol), {
    headers: HEADERS,
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[vci-financials] HTTP ${res.status} for ${symbol}: ${body.slice(0, 300)}`);
    throw new Error(`Vietcap trả về lỗi HTTP ${res.status} cho ${symbol}`);
  }

  const json = await res.json();
  const rows = extractRows(json);

  return rows
    .map(toRatioPoint)
    .filter((p): p is RatioPoint & { sortKey: number } => p !== null)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ period, periodType, values }) => ({ period, periodType, values }));
}
