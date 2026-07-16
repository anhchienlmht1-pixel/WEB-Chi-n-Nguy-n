import { NextRequest, NextResponse } from "next/server";
import { fetchKbsReport, KbsPeriodType, KbsReportType } from "@/lib/kbs";

const REPORT_TYPES: KbsReportType[] = ["KQKD", "CDKT", "LCTT", "CSTC"];
const PERIOD_TYPES: KbsPeriodType[] = ["year", "quarter"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const reportType = searchParams.get("type") as KbsReportType | null;
  const periodType = (searchParams.get("periodType") as KbsPeriodType | null) ?? "year";

  if (!symbol) {
    return NextResponse.json({ error: "Thiếu tham số symbol" }, { status: 400 });
  }
  if (!reportType || !REPORT_TYPES.includes(reportType)) {
    return NextResponse.json({ error: `Tham số type phải là một trong: ${REPORT_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!PERIOD_TYPES.includes(periodType)) {
    return NextResponse.json({ error: `Tham số periodType phải là một trong: ${PERIOD_TYPES.join(", ")}` }, { status: 400 });
  }

  try {
    // Large page size — request the full history back to company founding,
    // matching the earlier "từ lúc công ty mới thành lập" requirement.
    const report = await fetchKbsReport(symbol, reportType, periodType, 60);
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định khi tải dữ liệu tài chính";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
