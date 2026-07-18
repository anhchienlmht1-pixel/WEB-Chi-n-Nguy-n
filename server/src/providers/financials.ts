import { fetchKbsReport, type FinancialReport, type KbsPeriodType, type KbsReportType } from "./kbsFinancials.js";
import { fetchVndirectReport } from "./vndirectFinancials.js";
import { fetchVciReport } from "./vciFinancials.js";
import { fetchCafefReport } from "./cafefFinancials.js";

export type FinancialSource = "vndirect" | "kbs" | "vci" | "cafef";

export interface FinancialReportWithSource extends FinancialReport {
  source: FinancialSource;
  // Every non-winning source's outcome (periods found, or why it failed) —
  // normally invisible since only the winner's period count shows in the
  // UI, but a losing source's failure reason is exactly what's needed to
  // fix it, and there's no other way to see it short of digging through
  // server logs. Surfaced so a live report can show it directly.
  otherSources?: { source: FinancialSource; outcome: string }[];
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

// Every source is queried and whichever answers with the most periods wins
// — "didn't throw" isn't the same as "actually has enough history" (a live
// report showed VNDirect answering validly but stuck at 4 quarters while
// KBS had 8 for the same symbol), so a source that fails outright shouldn't
// block a deeper one, and a source that succeeds shallow shouldn't either.
const SOURCES: { name: FinancialSource; fetch: typeof fetchVndirectReport }[] = [
  { name: "vndirect", fetch: fetchVndirectReport },
  { name: "kbs", fetch: fetchKbsReport },
  { name: "vci", fetch: fetchVciReport },
  { name: "cafef", fetch: fetchCafefReport },
];

export async function fetchFinancialReport(
  symbol: string,
  reportType: KbsReportType,
  periodType: KbsPeriodType
): Promise<FinancialReportWithSource> {
  const results = await Promise.allSettled(SOURCES.map((s) => s.fetch(symbol, reportType, periodType)));

  const succeeded: FinancialReportWithSource[] = [];
  const outcomeBySource = new Map<FinancialSource, string>();
  results.forEach((result, i) => {
    const { name } = SOURCES[i];
    if (result.status === "fulfilled") {
      const report = { ...dedupePeriods(result.value), source: name };
      succeeded.push(report);
      outcomeBySource.set(name, `${report.periods.length} kỳ`);
    } else {
      outcomeBySource.set(name, errorMessage(result.reason).slice(0, 200));
    }
  });

  if (succeeded.length > 0) {
    const best = succeeded.reduce((a, b) => (b.periods.length > a.periods.length ? b : a));
    const otherSources = SOURCES.filter((s) => s.name !== best.source).map((s) => ({
      source: s.name,
      outcome: outcomeBySource.get(s.name) ?? "?",
    }));
    return { ...best, otherSources };
  }

  const failures = SOURCES.map((s) => `${s.name}: ${outcomeBySource.get(s.name)}`).join(" | ");
  throw Object.assign(new Error(`Tất cả nguồn báo cáo tài chính đều lỗi. ${failures}`), {
    status: 502,
  });
}
