import "server-only";
import { RatioPoint } from "./types";
import { RATIO_FIELDS, BVPS_INPUT_FIELDS } from "./ratioFields";
import { RawRow, extractPeriodLabel, extractRows, fetchVciJson, toNumber } from "./vciCommon";

// Vietcap's research/insight API (iq.vietcap.com.vn) — same brokerage as
// the trading.vietcap.com.vn price data already used elsewhere, exposing a
// financial-ratio endpoint per company (ROE, ROA, NIM, NPL, CASA, LDR,
// CIR, credit/deposit growth, etc.) that the vnstock community library
// reads from too. Unofficial/reverse-engineered — no API key, so treat it
// as best-effort with defensive parsing and a clear error on failure.
const RATIO_URL = (symbol: string) =>
  `https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/${encodeURIComponent(symbol)}/statistics-financial`;

function toRatioPoint(row: RawRow): (RatioPoint & { sortKey: number }) | null {
  const periodInfo = extractPeriodLabel(row);
  if (!periodInfo) return null;

  const values: Record<string, number | null> = {};
  for (const field of RATIO_FIELDS) {
    values[field.key] = toNumber(row[field.key]);
  }
  for (const key of BVPS_INPUT_FIELDS) {
    values[key] = toNumber(row[key]);
  }

  return { period: periodInfo.period, periodType: periodInfo.periodType, values, sortKey: periodInfo.sortKey };
}

export async function fetchVciRatios(symbol: string): Promise<RatioPoint[]> {
  const json = await fetchVciJson(RATIO_URL(symbol), symbol, "vci-financials");
  const rows = extractRows(json);

  if (rows.length === 0) {
    const preview = JSON.stringify(json).slice(0, 500);
    console.error(`[vci-financials] no rows extracted for ${symbol}. Raw: ${preview}`);
    throw new Error(`Không đọc được cấu trúc dữ liệu Vietcap cho ${symbol}. Raw: ${preview}`);
  }

  const parsed = rows.map(toRatioPoint);
  // Keep both quarterly and yearly rows — the UI filters by periodType for
  // its Quý/Năm toggle rather than the API dropping one of them, since
  // mixing them in one sorted list (rather than displaying only one type
  // at a time) is what caused a "2025" annual column to land in between
  // "Q4 2024" and "Q1 2025" before.
  const points = parsed
    .filter((p): p is RatioPoint & { sortKey: number } => p !== null)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ period, periodType, values }) => ({ period, periodType, values }));

  if (points.length === 0) {
    const sampleRow = rows[rows.length - 1];
    const sample = ["year", "quarter", "yearReport", "reportYear", "report_period", "reportPeriod"]
      .map((k) => `${k}=${JSON.stringify(sampleRow[k])}`)
      .join(", ");
    throw new Error(
      `Nhận được ${rows.length} dòng từ Vietcap cho ${symbol} nhưng không xác định được kỳ báo cáo. Mẫu field kỳ: ${sample}`
    );
  }

  const hasAnyValue = points.some((p) => Object.values(p.values).some((v) => v !== null));
  if (!hasAnyValue) {
    const sample = ["roe", "pe", "casaRatio", "npl"]
      .map((k) => `${k}=${JSON.stringify(rows[rows.length - 1][k])}`)
      .join(", ");
    throw new Error(
      `Nhận được ${rows.length} kỳ báo cáo từ Vietcap cho ${symbol}, field khớp tên nhưng giá trị rỗng. Mẫu giá trị thô: ${sample}`
    );
  }

  return points;
}
