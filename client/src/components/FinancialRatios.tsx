import { useMemo, useState } from "react";
import { fetchFinancials } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { FinancialPeriodType, FinancialReportType } from "../types";
import { formatFinancialValue } from "../utils/format";
import ProfitChart from "./ProfitChart";
import RatioTrendChart from "./RatioTrendChart";
import { sortPeriodIndices } from "../utils/period";

const REPORT_TABS: { value: FinancialReportType; label: string }[] = [
  { value: "CSTC", label: "Chỉ số tài chính" },
  { value: "KQKD", label: "Kết quả kinh doanh" },
  { value: "CDKT", label: "Cân đối kế toán" },
  { value: "LCTT", label: "Lưu chuyển tiền tệ" },
];

export default function FinancialRatios({ symbol }: { symbol: string }) {
  const [reportType, setReportType] = useState<FinancialReportType>("CSTC");
  const [periodType, setPeriodType] = useState<FinancialPeriodType>("year");

  const { data, error, loading } = usePolling(
    () => fetchFinancials(symbol, reportType, periodType),
    [symbol, reportType, periodType]
  );

  // Show newest period first — sorted by the actual year/quarter parsed out
  // of each label rather than assumed array order (KBS's raw order isn't
  // reliably oldest-first or newest-first).
  const displayPeriods = useMemo(() => {
    if (!data) return [];
    return sortPeriodIndices(data.periods, "desc").map((index) => ({ label: data.periods[index], index }));
  }, [data]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setReportType(tab.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                reportType === tab.value
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {(["year", "quarter"] as FinancialPeriodType[]).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setPeriodType(pt)}
              className={`rounded-md px-3 py-1 transition-colors ${
                periodType === pt
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {pt === "year" ? "Năm" : "Quý"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && (error || !data) && (
        <div className="p-4 text-sm text-red-500 dark:text-red-400">
          Không thể tải dữ liệu tài chính cho {symbol}{error ? `: ${error}` : ""}.
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Chưa có dữ liệu.</div>
      )}

      {!loading && data && data.items.length > 0 && reportType === "KQKD" && <ProfitChart report={data} />}
      {!loading && data && data.items.length > 0 && reportType === "CSTC" && <RatioTrendChart report={data} />}

      {!loading && data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium dark:bg-slate-900">
                  Chỉ tiêu
                </th>
                {displayPeriods.map((p) => (
                  <th key={p.index} className="whitespace-nowrap px-4 py-3 text-right font-medium">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                >
                  <td
                    className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300"
                    style={{ paddingLeft: `${1 + item.levels}rem` }}
                  >
                    <span className={item.levels === 0 ? "font-semibold text-slate-900 dark:text-slate-100" : ""}>
                      {item.name}
                    </span>
                    {item.unit && (
                      <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">({item.unit})</span>
                    )}
                  </td>
                  {displayPeriods.map((p) => (
                    <td
                      key={p.index}
                      className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300"
                    >
                      {formatFinancialValue(item.values[p.index], item.unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
