import { useMemo, type CSSProperties } from "react";
import { fetchHistory } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { buildMonthlyReturns } from "../utils/seasonality";

const MONTH_LABELS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

function cellStyle(value: number | null, maxAbs: number): CSSProperties {
  if (value == null || maxAbs === 0) return {};
  const alpha = Math.min(1, Math.max(0.12, Math.abs(value) / maxAbs));
  return { backgroundColor: value >= 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})` };
}

export default function SeasonalityHeatmap({ symbol }: { symbol: string }) {
  const { data, error, loading } = usePolling(() => fetchHistory(symbol, "MAX"), [symbol]);

  const table = useMemo(() => buildMonthlyReturns(data?.points ?? []), [data]);
  const maxAbs = useMemo(() => {
    let m = 0;
    for (const row of table.returns) {
      for (const v of row) if (v != null) m = Math.max(m, Math.abs(v));
    }
    return m;
  }, [table]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Lợi nhuận theo Tháng/Năm</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          % thay đổi giá đóng cửa cuối tháng so với cuối tháng trước
        </p>
      </div>

      {loading && (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && (error || table.years.length === 0) && (
        <div className="p-4 text-sm text-slate-1000 dark:text-slate-400">
          {error ? `Không thể tải dữ liệu: ${error}` : `Chưa đủ dữ liệu lịch sử cho ${symbol}.`}
        </div>
      )}

      {!loading && table.years.length > 0 && (
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-16 px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Năm
                </th>
                {MONTH_LABELS.map((m) => (
                  <th
                    key={m}
                    className="px-2 py-1.5 text-center text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.years.map((year, yIdx) => (
                <tr key={year}>
                  <td className="px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{year}</td>
                  {table.returns[yIdx].map((value, mIdx) => (
                    <td
                      key={mIdx}
                      className="rounded px-1.5 py-2 text-center text-xs tabular-nums text-slate-700 dark:text-slate-200"
                      style={cellStyle(value, maxAbs)}
                    >
                      {value == null ? "" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}
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
