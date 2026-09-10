import { usePolling } from "../hooks/usePolling";
import { fetchSecuritiesStatement } from "../utils/securitiesData";

// Full raw statement export (scripts/export-securities-data.py) — every
// line item from the source Excel's per-company sheet, not just the 14
// curated ratios in SecuritiesFundamentals' KPI table.
export default function SecuritiesStatementTable({
  symbol,
  periodType,
}: {
  symbol: string;
  periodType: "quarter" | "year";
}) {
  const { data, error, loading } = usePolling(() => fetchSecuritiesStatement(symbol), [symbol]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-slate-1000 dark:text-slate-400">
        Không tải được báo cáo chi tiết cho {symbol}{error ? `: ${error}` : ""}.
      </div>
    );
  }

  const periods = periodType === "quarter" ? data.quarterPeriods : data.yearPeriods;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
            <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium dark:bg-slate-900">Chỉ tiêu</th>
            {periods.map((p, i) => (
              <th key={`${p}-${i}`} className="whitespace-nowrap px-4 py-3 text-right font-medium">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => {
            const values = periodType === "quarter" ? item.quarter : item.year;
            return (
              <tr
                key={item.row}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
              >
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                  {item.name}
                </td>
                {values.map((v, i) => (
                  <td
                    key={i}
                    className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300"
                  >
                    {v === null || !Number.isFinite(v) ? "—" : v.toLocaleString("vi-VN", { maximumFractionDigits: 4 })}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
