import { useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { BANK_SYMBOL_LIST, fetchBankDetail } from "../utils/bankData";
import { CHART_GROUPS } from "../utils/bankDetailCharts";
import { formatDetailValue } from "../utils/bankDetailFormat";
import BankMetricLineChart from "./BankMetricLineChart";
import BankStackedBarChart from "./BankStackedBarChart";

type PeriodType = "quarter" | "year";

// A per-bank replica of the source Excel's own "Chi tiết" dashboard sheet
// (28 chart panels covering growth, income, credit mix, asset quality and
// liquidity) — see scripts/export-bank-detail.py and
// utils/bankDetailCharts.ts for how each panel's data was reverse-engineered
// from that sheet's actual formulas.
export default function BankDetailView({
  symbol,
  onSymbolChange,
}: {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}) {
  const [periodType, setPeriodType] = useState<PeriodType>("quarter");
  const { data, error, loading } = usePolling(() => fetchBankDetail(symbol), [symbol]);
  const periodData = data ? (periodType === "quarter" ? data.quarter : data.year) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Chi tiết mã ngân hàng</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Nguồn: dữ liệu tự tổng hợp (Excel).{" "}
            {periodType === "quarter" ? "Theo quý, Q1 2018 – Q1 2026." : "Theo năm, 2018 – 2025."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
            {(["quarter", "year"] as PeriodType[]).map((pt) => (
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
          <select
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {BANK_SYMBOL_LIST.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && (error || !periodData) && (
        <div className="p-4 text-sm text-red-500 dark:text-red-400">
          Không tải được dữ liệu chi tiết cho {symbol}
          {error ? `: ${error}` : ""}.
        </div>
      )}

      {!loading && periodData && (
        <div className="space-y-6 p-4">
          {CHART_GROUPS.map((group) => (
            <div key={group.section}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {group.section}
              </h4>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {group.charts.map((chart) => {
                  if (chart.kind === "dualLine" || chart.kind === "multiLine") {
                    const lines = (chart.lines ?? []).map((ref) => ({
                      label: chart.kind === "dualLine" ? symbol : ref.label,
                      color: ref.color,
                      values: periodData.bank[ref.id] ?? [],
                    }));
                    if (chart.kind === "dualLine" && chart.lines?.[0]) {
                      const id = chart.lines[0].id;
                      lines.push({
                        label: "Trung bình ngành",
                        color: "#94a3b8",
                        values: periodData.industry[id] ?? [],
                      });
                    }
                    return (
                      <BankMetricLineChart
                        key={chart.title}
                        title={chart.title}
                        periods={periodData.periods}
                        lines={lines}
                        formatValue={(v) => formatDetailValue(v, chart.format)}
                      />
                    );
                  }

                  const bars = (chart.bars ?? []).map((ref) => ({
                    label: ref.label,
                    color: ref.color,
                    values: periodData.bank[ref.id] ?? [],
                  }));
                  const lines = (chart.lines ?? []).map((ref) => ({
                    label: ref.label,
                    color: ref.color,
                    values: periodData.bank[ref.id] ?? [],
                  }));
                  return (
                    <BankStackedBarChart
                      key={chart.title}
                      title={chart.title}
                      periods={periodData.periods}
                      bars={bars}
                      lines={lines}
                      mode={chart.kind === "stackedShare" ? "share" : "absolute"}
                      format={chart.format}
                      lineFormat={chart.lineFormat}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
