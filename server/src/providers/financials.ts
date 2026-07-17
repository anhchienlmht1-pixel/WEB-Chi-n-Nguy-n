import { fetchKbsReport, type FinancialReport, type KbsPeriodType, type KbsReportType } from "./kbsFinancials.js";
import { fetchVndirectReport } from "./vndirectFinancials.js";

export interface FinancialReportWithSource extends FinancialReport {
  source: "vndirect" | "kbs";
}

// VNDirect is tried first — its public finfo API is understood to carry
// deeper historical coverage than KBS's retail-app endpoint. KBS (already
// confirmed working, including two bugs found and fixed from live reports)
// is the fallback whenever VNDirect fails for any reason, so a wrong guess
// in the new VNDirect integration degrades to "shorter history" rather than
// "no data at all".
export async function fetchFinancialReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType
): Promise<FinancialReportWithSource> {
  try {
    const report = await fetchVndirectReport(symbol, reportType, periodType);
    return { ...report, source: "vndirect" };
  } catch (vndErr) {
    try {
      const report = await fetchKbsReport(symbol, reportType, periodType);
      return { ...report, source: "kbs" };
    } catch (kbsErr) {
      const vndMsg = vndErr instanceof Error ? vndErr.message : String(vndErr);
      const kbsMsg = kbsErr instanceof Error ? kbsErr.message : String(kbsErr);
      throw Object.assign(new Error(`Cả 2 nguồn báo cáo tài chính đều lỗi. VNDirect: ${vndMsg} | KBS: ${kbsMsg}`), {
        status: 502,
      });
    }
  }
}
