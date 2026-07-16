import "server-only";
import { FinancialLineItem, FinancialReport } from "./types";

// KB Securities (KBS) — recommended as the default financial-data source by
// the vnstock community library (TCBS is deprecated; VCI has fewer/less
// detailed items). Verified against thinh-vu/vnstock's KBS explorer source
// (explorer/kbs/const.py, explorer/kbs/financial.py) since there's no
// public API documentation. No API key required.
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

// Which Content{} keys (Vietnamese section names) belong to each report
// type — matched by substring since the exact key can vary (e.g. cash
// flow is either "gián tiếp" or "trực tiếp" depending on what the
// company reports), rather than requiring an exact string match.
const SECTION_MATCH: Record<KbsReportType, string[]> = {
  KQKD: ["Kết quả kinh doanh"],
  CDKT: ["Cân đối kế toán"],
  LCTT: ["Lưu chuyển tiền tệ"],
  CSTC: ["Nhóm chỉ số"],
};

interface RawHead {
  YearPeriod?: string | number;
  TermName?: string;
  TermNameEN?: string;
  [key: string]: unknown;
}

interface RawLineItem {
  ID?: number | string;
  Name?: string;
  NameEn?: string;
  Unit?: string;
  Levels?: number;
  [key: string]: unknown;
}

interface RawResponse {
  Head?: RawHead[];
  Content?: Record<string, RawLineItem[]>;
}

function periodLabel(head: RawHead): string {
  const year = String(head.YearPeriod ?? "").match(/\d{4}/)?.[0];
  const term = head.TermName ?? "";
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
): Promise<RawResponse> {
  const url = new URL(FINANCE_INFO_URL(symbol));
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("type", reportType);
  url.searchParams.set("unit", "1000");
  url.searchParams.set("termtype", periodType === "year" ? "1" : "2");
  url.searchParams.set("languageid", "1");

  const res = await fetch(url.toString(), { headers: HEADERS, next: { revalidate: 3600 } });
  const rawBody = await res.text();

  if (!res.ok) {
    console.error(`[kbs] HTTP ${res.status} for ${symbol} ${reportType}: ${rawBody.slice(0, 300)}`);
    throw new Error(`KBS trả về lỗi HTTP ${res.status} cho ${symbol}`);
  }

  try {
    return JSON.parse(rawBody) as RawResponse;
  } catch {
    console.error(`[kbs] non-JSON response for ${symbol} ${reportType}: ${rawBody.slice(0, 200)}`);
    throw new Error(`KBS trả về dữ liệu không hợp lệ cho ${symbol}`);
  }
}

/**
 * Fetches one financial report (income statement / balance sheet / cash
 * flow / ratios) for a symbol from KBS, item-based: each row is a line
 * item (e.g. "Doanh thu"), each column a reporting period. Response shape
 * isn't publicly documented, so this parses defensively and throws a
 * diagnostic-rich error (raw payload / section keys) if the expected
 * shape isn't found, rather than silently returning nothing.
 */
export async function fetchKbsReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType,
  periodCount = 8
): Promise<FinancialReport> {
  const data = await fetchKbsPage(symbol, reportType, periodType, 1, periodCount);

  const head = data.Head ?? [];
  const content = data.Content ?? {};

  if (head.length === 0 || Object.keys(content).length === 0) {
    const preview = JSON.stringify(data).slice(0, 500);
    throw new Error(`KBS trả về dữ liệu rỗng cho ${symbol} (${reportType}). Raw: ${preview}`);
  }

  const patterns = SECTION_MATCH[reportType];
  const matchingKeys = Object.keys(content).filter((key) => patterns.some((p) => key.includes(p)));

  if (matchingKeys.length === 0) {
    throw new Error(
      `Không tìm thấy mục dữ liệu cho ${symbol} (${reportType}). Các mục thực tế: ${Object.keys(content).join(", ")}`
    );
  }

  const rows: RawLineItem[] = matchingKeys.flatMap((key) => content[key] ?? []);
  if (rows.length === 0) {
    throw new Error(`KBS trả về ${matchingKeys.join(", ")} nhưng không có dòng dữ liệu nào cho ${symbol}.`);
  }

  const periods = head.map(periodLabel);

  const items: FinancialLineItem[] = rows.map((row, i) => {
    const valueKeys = Object.keys(row)
      .filter((k) => /^Value\d+$/.test(k))
      .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
    const values = head.map((_, idx) => toNumber(row[valueKeys[idx]]));

    return {
      id: row.ID !== undefined ? String(row.ID) : `${reportType}-${i}`,
      name: row.Name ?? "",
      nameEn: row.NameEn ?? "",
      unit: row.Unit ?? "",
      levels: typeof row.Levels === "number" ? row.Levels : 0,
      values,
    };
  });

  const hasAnyValue = items.some((it) => it.values.some((v) => v !== null));
  if (!hasAnyValue) {
    const sampleRow = rows[0];
    throw new Error(
      `Nhận được ${items.length} dòng cho ${symbol} (${reportType}) nhưng toàn bộ giá trị rỗng. Field mẫu: ${Object.keys(sampleRow).join(", ")}`
    );
  }

  return { periods, items };
}
