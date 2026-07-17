import { fetchKbsReport, type FinancialReport, type KbsPeriodType, type KbsReportType } from "./kbsFinancials.js";
import { fetchVndirectReport } from "./vndirectFinancials.js";

export interface FinancialReportWithSource extends FinancialReport {
  source: "vndirect" | "kbs";
}

// Both KBS and VNDirect have shown real data-quality quirks before (KBS's
// pageSize cap, its CDKT section-label mismatch) — a live report surfaced
// another one: the same period label (e.g. "Q4 2025") appearing twice as
// separate columns, which duplicates x-axis labels and throws off anything
// that indexes by period. Collapsing same-label columns here, once, means
// every chart/table downstream can keep assuming periods are unique without
// needing to defend against it individually.
function dedupePeriods(report: FinancialReport): FinancialReport {
  const indicesByLabel = new Map<string, number[]>();
  report.periods.forEach((label, i) => {
    const arr = indicesByLabel.get(label);
    if (arr) arr.push(i);
    else indicesByLabel.set(label, [i]);
  });

  if ([...indicesByLabel.values()].every((idxs) => idxs.length === 1)) return report;

  const periods = [...indicesByLabel.keys()];
  const items = report.items.map((item) => ({
    ...item,
    values: periods.map((label) => {
      const idxs = indicesByLabel.get(label)!;
      for (let k = idxs.length - 1; k >= 0; k--) {
        const v = item.values[idxs[k]];
        if (v !== null) return v;
      }
      return null;
    }),
  }));

  return { ...report, periods, items };
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
    const report = dedupePeriods(await fetchVndirectReport(symbol, reportType, periodType));
    return { ...report, source: "vndirect" };
  } catch (vndErr) {
    try {
      const report = dedupePeriods(await fetchKbsReport(symbol, reportType, periodType));
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
