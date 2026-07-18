import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import {
  CORE_METRIC_KEYS,
  METRIC_META,
  SECURITIES_SYMBOL_LIST,
  fetchSecuritiesOverview,
  formatMetricValue,
} from "../utils/securitiesData";
import type { SecuritiesMetricKey } from "../types/securities";
import SecuritiesDetailView from "../components/SecuritiesDetailView";

type SortDir = "asc" | "desc";
type Tab = "compare" | "detail";

// Matches the securities-industry workbook's own "Tổng quan" sheet: every
// company, one row each, at the latest common period — sortable by any of
// the 14 core ratios. A second tab ("Chi tiết mã chứng khoán") replicates
// that same workbook's much deeper per-company "Chi tiết" dashboard sheet
// (see SecuritiesDetailView) — same two-tab architecture as BankCompare.
export default function SecuritiesCompare() {
  const { data, error, loading } = usePolling(() => fetchSecuritiesOverview(), []);
  const [sortKey, setSortKey] = useState<SecuritiesMetricKey>("roe");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [tab, setTab] = useState<Tab>("compare");
  const [detailSymbol, setDetailSymbol] = useState<string>(SECURITIES_SYMBOL_LIST[0]);

  const sortedCompanies = useMemo(() => {
    if (!data) return [];
    const rows = [...data.companies];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  function toggleSort(key: SecuritiesMetricKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">So sánh chứng khoán</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        16 công ty chứng khoán niêm yết, tại kỳ {data?.period ?? "gần nhất"}. Bấm vào tiêu đề cột để sắp xếp.
      </p>

      <div className="mt-4 flex w-fit gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
        {(
          [
            ["compare", "Bảng so sánh"],
            ["detail", "Chi tiết mã chứng khoán"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              tab === value
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "detail" && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          <SecuritiesDetailView symbol={detailSymbol} onSymbolChange={setDetailSymbol} />
        </div>
      )}

      {tab === "compare" && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          {loading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          )}

          {!loading && (error || !data) && (
            <div className="p-4 text-sm text-red-500 dark:text-red-400">
              Không tải được dữ liệu so sánh{error ? `: ${error}` : ""}.
            </div>
          )}

          {!loading && data && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                    <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium dark:bg-slate-900">
                      Công ty
                    </th>
                    {CORE_METRIC_KEYS.map((key) => (
                      <th key={key} className="whitespace-nowrap px-3 py-3 text-right font-medium">
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className={`inline-flex items-center gap-1 transition-colors ${
                            sortKey === key
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "hover:text-slate-900 dark:hover:text-slate-100"
                          }`}
                        >
                          {METRIC_META[key].label}
                          {sortKey === key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedCompanies.map((row) => (
                    <tr
                      key={row.symbol}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                    >
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 dark:bg-slate-900/40">
                        <Link
                          to={`/stock/${row.symbol}`}
                          className="font-semibold text-slate-900 hover:text-emerald-600 dark:text-slate-100 dark:hover:text-emerald-400"
                        >
                          {row.symbol}
                        </Link>
                        <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">{row.exchange}</span>
                      </td>
                      {CORE_METRIC_KEYS.map((key) => (
                        <td
                          key={key}
                          className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300"
                        >
                          {formatMetricValue(row[key], METRIC_META[key].format)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
