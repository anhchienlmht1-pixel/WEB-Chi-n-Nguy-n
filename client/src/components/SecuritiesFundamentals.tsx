import { useState } from "react";
import { usePolling } from "../hooks/usePolling";
import {
  CORE_METRIC_KEYS,
  METRIC_META,
  fetchSecuritiesData,
  formatMetricValue,
  metricDelta,
} from "../utils/securitiesData";
import type { SecuritiesMetricKey, SecuritiesPeriodData } from "../types/securities";
import BankMetricLineChart from "./BankMetricLineChart";
import SecuritiesStatementTable from "./SecuritiesStatementTable";

type PeriodType = "quarter" | "year";

const CHART_GROUPS: { title: string; keys: SecuritiesMetricKey[]; format: "percent" | "perShare" | "money" }[] = [
  { title: "Khả năng sinh lời: ROE & ROA", keys: ["roe", "roa"], format: "percent" },
  { title: "Định giá: EPS & BVPS", keys: ["epsBasic", "bvps"], format: "perShare" },
  { title: "Biên lợi nhuận: Gộp / LNTT / LNST", keys: ["grossMargin", "pretaxMargin", "netMargin"], format: "percent" },
  { title: "Môi giới: Biên LN & Tỷ trọng doanh thu", keys: ["brokerageMargin", "brokerageRevenueShare"], format: "percent" },
  { title: "Cho vay margin: Lãi suất / Chi phí vốn / Biên lãi", keys: ["marginRate", "fundingCost", "marginSpread"], format: "percent" },
  { title: "Tỷ trọng lợi nhuận tự doanh", keys: ["propProfitShare"], format: "percent" },
  { title: "Dư nợ margin", keys: ["marginBalance"], format: "money" },
];

const LINE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a78bfa", "#f472b6"];

function formatPercentTick(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function formatMoneyTick(v: number): string {
  return v.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
}

function formatPerShareTick(v: number): string {
  return v.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
}

const TICK_FORMATTERS = { percent: formatPercentTick, money: formatMoneyTick, perShare: formatPerShareTick };

export default function SecuritiesFundamentals({ symbol }: { symbol: string }) {
  const [periodType, setPeriodType] = useState<PeriodType>("quarter");
  const [showStatement, setShowStatement] = useState(false);
  const { data, error, loading } = usePolling(() => fetchSecuritiesData(symbol), [symbol]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cơ bản (Chứng khoán)</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Nguồn: dữ liệu tự tổng hợp (Excel), cập nhật thủ công khi có kỳ mới.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {(["quarter", "year"] as PeriodType[]).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setPeriodType(pt)}
              className={`rounded-md px-3 py-1 transition-colors ${
                periodType === pt
                  ? "bg-slate-1000 text-slate-950"
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
        <div className="p-4 text-sm text-slate-1000 dark:text-slate-400">
          Không tải được dữ liệu cơ bản cho {symbol}{error ? `: ${error}` : ""}.
        </div>
      )}

      {!loading && data && (
        <>
          <KpiTable periodData={periodType === "quarter" ? data.quarter : data.year} showYoy={periodType === "quarter"} />

          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
            {CHART_GROUPS.map((group) => {
              const periodData = periodType === "quarter" ? data.quarter : data.year;
              const lines = group.keys.map((key, i) => ({
                label: METRIC_META[key].label,
                color: LINE_COLORS[i % LINE_COLORS.length],
                values: periodData.metrics[key],
              }));
              return (
                <BankMetricLineChart
                  key={group.title}
                  title={group.title}
                  periods={periodData.periods}
                  lines={lines}
                  formatValue={TICK_FORMATTERS[group.format]}
                />
              );
            })}
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowStatement((v) => !v)}
              className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300"
            >
              {showStatement ? "Ẩn báo cáo tài chính chi tiết ▲" : "Xem toàn bộ báo cáo tài chính chi tiết ▼"}
            </button>
            {showStatement && (
              <div className="mt-4">
                <SecuritiesStatementTable symbol={symbol} periodType={periodType} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiTable({ periodData, showYoy }: { periodData: SecuritiesPeriodData; showYoy: boolean }) {
  const n = periodData.periods.length;
  const latest = n - 1;
  const prior = n - 2;
  const yearAgo = n - 5;

  return (
    <div className="overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
            <th className="px-4 py-3 font-medium">Chỉ tiêu</th>
            <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
              {latest >= 0 ? periodData.periods[latest] : "—"}
            </th>
            <th className="whitespace-nowrap px-4 py-3 text-right font-medium">So với kỳ trước</th>
            {showYoy && <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Cùng kỳ năm trước</th>}
          </tr>
        </thead>
        <tbody>
          {CORE_METRIC_KEYS.map((key) => {
            const meta = METRIC_META[key];
            const values = periodData.metrics[key];
            const currentVal = latest >= 0 ? values[latest] : null;
            const priorVal = prior >= 0 ? values[prior] : null;
            const yoyVal = yearAgo >= 0 ? values[yearAgo] : null;
            return (
              <tr
                key={key}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                  {meta.label}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {formatMetricValue(currentVal, meta.format)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                  {metricDelta(currentVal, priorVal, meta.format)}
                </td>
                {showYoy && (
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {metricDelta(currentVal, yoyVal, meta.format)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
