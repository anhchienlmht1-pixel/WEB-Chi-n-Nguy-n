import "server-only";

export const VCI_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://trading.vietcap.com.vn/",
  Origin: "https://trading.vietcap.com.vn",
};

export interface RawRow {
  [key: string]: unknown;
}

// Some finance APIs send numbers as strings to avoid float precision loss
// in transit — accept both rather than assuming a bare `number`.
export function toNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export interface PeriodInfo {
  period: string;
  periodType: "quarter" | "year";
  sortKey: number;
}

export function extractPeriodLabel(row: RawRow): PeriodInfo | null {
  const year = toNumber(row.year ?? row.yearReport ?? row.reportYear);
  const quarter = toNumber(row.quarter ?? row.quarterReport ?? row.reportQuarter);
  const reportPeriod = row.report_period ?? row.reportPeriod;

  if (year !== null && quarter !== null && quarter >= 1 && quarter <= 4) {
    return { period: `Q${quarter} ${year}`, periodType: "quarter", sortKey: year * 10 + quarter };
  }
  if (year !== null) {
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

/**
 * Response shape isn't documented anywhere public — try the plausible
 * variants (bare array, {data: [...]}, {quarters: [...], years: [...]}) and
 * take whichever actually has rows, rather than assuming one exact shape.
 */
export function extractRows(json: unknown): RawRow[] {
  if (Array.isArray(json)) return json as RawRow[];
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as RawRow[];
    const combined = [
      ...(Array.isArray(obj.quarters) ? (obj.quarters as RawRow[]) : []),
      ...(Array.isArray(obj.years) ? (obj.years as RawRow[]) : []),
    ];
    if (combined.length > 0) return combined;
  }
  return [];
}

export async function fetchVciJson(url: string, symbol: string, label: string): Promise<unknown> {
  const res = await fetch(url, { headers: VCI_HEADERS, next: { revalidate: 3600 } });
  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[${label}] HTTP ${res.status} for ${symbol}: ${rawBody.slice(0, 300)}`);
    throw new Error(`Vietcap trả về lỗi HTTP ${res.status} cho ${symbol}`);
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    console.error(`[${label}] non-JSON response for ${symbol}: ${rawBody.slice(0, 200)}`);
    throw new Error(`Vietcap trả về dữ liệu không hợp lệ cho ${symbol}`);
  }
}
