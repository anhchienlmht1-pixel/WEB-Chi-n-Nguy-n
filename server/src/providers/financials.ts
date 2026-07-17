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

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

// VNDirect was assumed to have deeper historical coverage than KBS's
// retail-app endpoint, so it used to be tried first with KBS only as a
// fallback on outright failure. A live report broke that assumption: VNDirect
// returned a *valid* response (didn't throw) but stuck at 4 quarters no
// matter how much pagination asked for more, while a company's real
// reporting history obviously goes back further — "didn't throw" isn't the
// same as "actually has enough history". Both sources are queried and
// whichever has more periods for this exact call wins, instead of trusting
// whichever happened to answer first without erroring.
export async function fetchFinancialReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType
): Promise<FinancialReportWithSource> {
  const [vndResult, kbsResult] = await Promise.allSettled([
    fetchVndirectReport(symbol, reportType, periodType),
    fetchKbsReport(symbol, reportType, periodType),
  ]);

  const vnd: FinancialReportWithSource | null =
    vndResult.status === "fulfilled" ? { ...dedupePeriods(vndResult.value), source: "vndirect" } : null;
  const kbs: FinancialReportWithSource | null =
    kbsResult.status === "fulfilled" ? { ...dedupePeriods(kbsResult.value), source: "kbs" } : null;

  if (vnd && kbs) return vnd.periods.length >= kbs.periods.length ? vnd : kbs;
  if (vnd) return vnd;
  if (kbs) return kbs;

  const vndMsg = vndResult.status === "rejected" ? errorMessage(vndResult.reason) : "?";
  const kbsMsg = kbsResult.status === "rejected" ? errorMessage(kbsResult.reason) : "?";
  throw Object.assign(new Error(`Cả 2 nguồn báo cáo tài chính đều lỗi. VNDirect: ${vndMsg} | KBS: ${kbsMsg}`), {
    status: 502,
  });
}
