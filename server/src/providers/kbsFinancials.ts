// KB Securities (KBS) — recommended as the default financial-data source by
// the vnstock community library (TCBS is deprecated; VCI has fewer/less
// detailed items). Verified against thinh-vu/vnstock's KBS explorer source
// (explorer/kbs/const.py, explorer/kbs/financial.py) since there's no public
// API documentation. No API key required.
const FINANCE_INFO_URL = (symbol: string) =>
  `https://kbbuddywts.kbsec.com.vn/iis-server/investment/stock/finance-info/${encodeURIComponent(symbol)}`;

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://kbbuddywts.kbsec.com.vn/",
  Origin: "https://kbbuddywts.kbsec.com.vn",
};

export type KbsReportType = "KQKD" | "CDKT" | "LCTT" | "CSTC";
export type KbsPeriodType = "year" | "quarter";

export interface FinancialLineItem {
  id: string;
  name: string;
  nameEn: string;
  unit: string;
  levels: number;
  values: (number | null)[];
}

export interface FinancialReport {
  periods: string[];
  items: FinancialLineItem[];
}

// Which Content{} keys (Vietnamese section names) belong to each report
// type — matched by substring since the exact key can vary (e.g. cash flow
// is either "gián tiếp" or "trực tiếp" depending on what the company
// reports), rather than requiring an exact string match.
const SECTION_MATCH: Record<KbsReportType, string[]> = {
  KQKD: ["Kết quả kinh doanh"],
  // KBS labels this "Báo cáo tình hình tài chính" (confirmed live for VNM),
  // not the older "Cân đối kế toán" term — keep both since either could
  // show up depending on how a given company's data was tagged.
  CDKT: ["Cân đối kế toán", "Báo cáo tình hình tài chính", "Bảng cân đối kế toán"],
  LCTT: ["Lưu chuyển tiền tệ"],
  CSTC: ["Nhóm chỉ số"],
};

function periodLabel(head: any): string {
  const year = String(head?.YearPeriod ?? "").match(/\d{4}/)?.[0];
  const term = head?.TermName ?? "";
  const quarterMatch = term.match(/(\d)/);
  if (/quý|quarter/i.test(term) && quarterMatch && year) {
    return `Q${quarterMatch[1]} ${year}`;
  }
  return year ?? term ?? "?";
}

function toNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchKbsPage(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType,
  page: number,
  pageSize: number
): Promise<any> {
  const url = new URL(FINANCE_INFO_URL(symbol));
  url.searchParams.set("page", String(page));
  // KBS hard-rejects pageSize > 50 with HTTP 500, so clamp defensively
  // regardless of what the caller asked for.
  url.searchParams.set("pageSize", String(Math.min(50, pageSize)));
  url.searchParams.set("type", reportType);
  url.searchParams.set("unit", "1000");
  url.searchParams.set("termtype", periodType === "year" ? "1" : "2");
  url.searchParams.set("languageid", "1");

  const res = await fetch(url.toString(), { headers: HEADERS });
  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[kbs] HTTP ${res.status} for ${symbol} ${reportType}: ${rawBody.slice(0, 300)}`);
    throw Object.assign(new Error(`KBS trả về lỗi HTTP ${res.status} cho ${symbol}`), { status: 502 });
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    console.error(`[kbs] non-JSON response for ${symbol} ${reportType}: ${rawBody.slice(0, 200)}`);
    throw Object.assign(new Error(`KBS trả về dữ liệu không hợp lệ cho ${symbol}`), { status: 502 });
  }
}

const KBS_PAGE_SIZE = 50; // KBS's own hard cap — "pageSize must not be greater than 50"
const KBS_MAX_PAGES = 12;

interface AccumulatedRow {
  name: string;
  nameEn: string;
  unit: string;
  levels: number;
  values: (number | null)[];
}

function rowValuesForPage(row: any, head: any[]): (number | null)[] {
  const valueKeys = Object.keys(row)
    .filter((k) => /^Value\d+$/.test(k))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
  return head.map((_, idx) => toNumber(row[valueKeys[idx]]));
}

/**
 * Fetches one financial report (income statement / balance sheet / cash
 * flow / ratios) for a symbol from KBS, item-based: each row is a line item
 * (e.g. "Doanh thu"), each column a reporting period. Response shape isn't
 * publicly documented, so this parses defensively and throws a diagnostic-
 * rich error (raw payload / section keys) if the expected shape isn't
 * found, rather than silently returning nothing.
 *
 * A live report showed exactly 4 periods no matter how high `periodCount`
 * was set, on both year and quarter views — the same symptom VNDirect had
 * (a `size`/`pageSize` request not actually being honored past some smaller
 * real per-request cap). Paginates through `page=1,2,3...` the same way
 * that was fixed for VNDirect, instead of trusting a single request's Head
 * array to be the whole history.
 */
export async function fetchKbsReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType,
  periodCount = 80
): Promise<FinancialReport> {
  let allHead: any[] = [];
  const rowsById = new Map<string, AccumulatedRow>();
  let matchingKeys: string[] | null = null;
  let firstPageData: any = null;

  for (let page = 1; page <= KBS_MAX_PAGES; page++) {
    const data = await fetchKbsPage(symbol, reportType, periodType, page, KBS_PAGE_SIZE);
    if (page === 1) firstPageData = data;

    const head: any[] = data?.Head ?? [];
    const content: Record<string, any[]> = data?.Content ?? {};

    if (head.length === 0 || Object.keys(content).length === 0) break;

    if (matchingKeys === null) {
      const patterns = SECTION_MATCH[reportType];
      matchingKeys = Object.keys(content).filter((key) => patterns.some((p) => key.includes(p)));
      if (matchingKeys.length === 0) {
        throw Object.assign(
          new Error(
            `Không tìm thấy mục dữ liệu cho ${symbol} (${reportType}). Các mục thực tế: ${Object.keys(content).join(", ")}`
          ),
          { status: 502 }
        );
      }
    }

    const rows: any[] = matchingKeys.flatMap((key) => content[key] ?? []);
    if (rows.length === 0) break;

    // Don't assume a page shorter than KBS_PAGE_SIZE proves there's no more
    // data — the live report this fix is for showed KBS enforcing its own
    // smaller per-request cap regardless of pageSize, so every page looked
    // "short". Stop once a page brings back nothing but periods already
    // seen (either truly out of history, or `page` isn't honored and every
    // request just repeats page 1 — same outcome either way) — checked
    // before merging, so a fully-repeated page never gets double-counted.
    const labelsSeenBefore = new Set(allHead.map(periodLabel));
    const hasNewPeriod = head.map(periodLabel).some((label) => !labelsSeenBefore.has(label));
    if (!hasNewPeriod) break;

    const periodsBeforeThisPage = allHead.length;
    allHead = allHead.concat(head);

    for (const row of rows) {
      const id = row.ID !== undefined ? String(row.ID) : row.Name ?? `${reportType}-${rowsById.size}`;
      let acc = rowsById.get(id);
      if (!acc) {
        acc = {
          name: row.Name ?? "",
          nameEn: row.NameEn ?? "",
          unit: row.Unit ?? "",
          levels: typeof row.Levels === "number" ? row.Levels : 0,
          // Pad so a row first seen on a later page still lines up with
          // periods already accumulated from earlier pages.
          values: new Array(periodsBeforeThisPage).fill(null),
        };
        rowsById.set(id, acc);
      }
      acc.values.push(...rowValuesForPage(row, head));
    }

    if (allHead.length >= periodCount) break;
  }

  if (allHead.length === 0) {
    const preview = JSON.stringify(firstPageData).slice(0, 500);
    throw Object.assign(new Error(`KBS trả về dữ liệu rỗng cho ${symbol} (${reportType}). Raw: ${preview}`), {
      status: 502,
    });
  }

  const periods = allHead.map(periodLabel);
  const items: FinancialLineItem[] = [...rowsById.entries()].map(([id, r]) => ({
    id,
    name: r.name,
    nameEn: r.nameEn,
    unit: r.unit,
    levels: r.levels,
    // Rows that stopped appearing on a later page (shouldn't normally
    // happen for a fixed statement's line items) still need to line up
    // with the full period count.
    values: r.values.length < periods.length ? r.values.concat(new Array(periods.length - r.values.length).fill(null)) : r.values,
  }));

  const hasAnyValue = items.some((it) => it.values.some((v) => v !== null));
  if (!hasAnyValue) {
    throw Object.assign(
      new Error(`Nhận được ${items.length} dòng cho ${symbol} (${reportType}) nhưng toàn bộ giá trị rỗng.`),
      { status: 502 }
    );
  }

  return { periods, items };
}
