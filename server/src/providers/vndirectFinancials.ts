import type { FinancialLineItem, FinancialReport, KbsPeriodType, KbsReportType } from "./kbsFinancials.js";

// VNDirect's public "finfo" API — same host/base already used for prices in
// vndirectProvider.ts (finfo-api.vndirect.com.vn/v4), known in the VN
// fintech dev community for having deeper financial-statement history than
// typical broker retail APIs. Its financial_statements endpoint's exact
// response shape is NOT verified live (this sandbox can't reach any
// external financial data host), so this is a best-effort reverse-engineer
// following the same query-string convention as the already-working
// stock_prices endpoint, with a diagnostic-rich failure path — if the shape
// guessed here is wrong, the error will show a raw sample row so it can be
// corrected from one real report instead of guessed again blind.
const FINFO_BASE = "https://finfo-api.vndirect.com.vn/v4";

const HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

const REPORT_TYPE_MAP: Record<KbsReportType, string> = {
  KQKD: "INCOME_STATEMENT",
  CDKT: "BALANCE_SHEET",
  LCTT: "CASH_FLOW",
  CSTC: "RATIO",
};

function toNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function fetchVndirectReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType,
  // 80 quarters / years covers 20 years of quarterly history (or 80 years
  // annually) — VNDirect's own API doesn't have KBS's 50-row cap, so there's
  // no reason to trim harder than "however far back the data actually goes".
  maxPeriods = 80
): Promise<FinancialReport> {
  const vndReportType = REPORT_TYPE_MAP[reportType];
  const fiscalDateType = periodType === "quarter" ? "QUARTER" : "YEAR";
  const q = `code:${symbol}~reportType:${vndReportType}~fiscalDateType:${fiscalDateType}`;
  const url = `${FINFO_BASE}/financial_statements?q=${encodeURIComponent(q)}&sort=fiscalDate:desc&size=${maxPeriods * 80}`;

  const res = await fetch(url, { headers: HEADERS });
  const rawBody = await res.text();

  if (!res.ok) {
    throw Object.assign(
      new Error(`VNDirect trả lỗi HTTP ${res.status} cho ${symbol} (${reportType}). Nội dung: ${rawBody.slice(0, 300)}`),
      { status: 502 }
    );
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw Object.assign(
      new Error(`VNDirect trả dữ liệu không phải JSON cho ${symbol} (${reportType}): ${rawBody.slice(0, 200)}`),
      { status: 502 }
    );
  }

  const rows: any[] = Array.isArray(data?.data) ? data.data : [];
  if (rows.length === 0) {
    throw Object.assign(
      new Error(`VNDirect trả về rỗng cho ${symbol} (${reportType}). Raw: ${JSON.stringify(data).slice(0, 400)}`),
      { status: 502 }
    );
  }

  const sample = rows[0];
  const looksValid = sample && (sample.fiscalDate || sample.itemCode || sample.numericValue !== undefined);
  if (!looksValid) {
    throw Object.assign(
      new Error(
        `VNDirect trả về dữ liệu không đúng cấu trúc mong đợi cho ${symbol} (${reportType}). Mẫu 1 dòng: ${JSON.stringify(sample).slice(0, 400)}`
      ),
      { status: 502 }
    );
  }

  // Pivot flat (itemCode, fiscalDate, value) rows into one line-item row per
  // itemCode with one column per period — same shape kbsFinancials.ts uses.
  const periodsSet = new Set<string>();
  const itemsMap = new Map<
    string,
    { name: string; nameEn: string; unit: string; values: Map<string, number | null> }
  >();

  for (const row of rows) {
    const fiscalDate = String(row.fiscalDate ?? row.fiscalYear ?? "?");
    const itemCode = String(row.itemCode ?? row.itemName ?? "?");
    const name = String(row.itemName ?? row.itemNameVi ?? itemCode);
    const nameEn = String(row.itemNameEn ?? name);
    const unit = String(row.unit ?? "");
    const value = toNumber(row.numericValue ?? row.value);

    periodsSet.add(fiscalDate);
    if (!itemsMap.has(itemCode)) {
      itemsMap.set(itemCode, { name, nameEn, unit, values: new Map() });
    }
    itemsMap.get(itemCode)!.values.set(fiscalDate, value);
  }

  const periods = [...periodsSet].sort().slice(-maxPeriods);

  const items: FinancialLineItem[] = [...itemsMap.entries()].map(([id, it], i) => ({
    id: id || `vnd-${i}`,
    name: it.name,
    nameEn: it.nameEn,
    unit: it.unit,
    levels: 0,
    values: periods.map((p) => it.values.get(p) ?? null),
  }));

  const hasAnyValue = items.some((it) => it.values.some((v) => v !== null));
  if (!hasAnyValue) {
    throw Object.assign(
      new Error(`VNDirect trả về ${items.length} chỉ tiêu cho ${symbol} (${reportType}) nhưng toàn bộ giá trị rỗng.`),
      { status: 502 }
    );
  }

  return { periods, items };
}
