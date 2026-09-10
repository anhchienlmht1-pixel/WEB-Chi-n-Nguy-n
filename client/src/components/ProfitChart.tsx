import type { FinancialReport } from "../types";
import { formatFinancialValue } from "../utils/format";
import { sortPeriodIndices } from "../utils/period";
import { findProfitItem } from "../utils/financials";

const BAR_AREA_HEIGHT = 200;

export default function ProfitChart({ report }: { report: FinancialReport }) {
  const item = findProfitItem(report);
  if (!item) return null;

  // Chart timelines always read oldest (left) -> newest (right), regardless
  // of whatever order KBS's raw period array happens to be in.
  const order = sortPeriodIndices(report.periods, "asc");
  const values = order
    .map((i) => item.values[i])
    .filter((v): v is number => v != null && Number.isFinite(v));

  // When every period is on the same side of zero (all profit or all loss),
  // a handful of similarly-sized values can look identical if forced to
  // start from 0 — most of the bar height goes unused. Zoom the scale to
  // the actual min/max range instead so differences between periods are
  // visible. Keep the 0-anchored scale when signs are mixed, since crossing
  // zero (profit <-> loss) is itself the meaningful thing to show there.
  const allPositive = values.length > 1 && values.every((v) => v >= 0);
  const allNegative = values.length > 1 && values.every((v) => v <= 0);
  const zoomed = allPositive || allNegative;

  let barHeight: (v: number) => number;
  if (zoomed) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || Math.abs(max) * 0.1 || 1;
    const low = min - range * 0.15;
    const high = max + range * 0.15;
    barHeight = (v) => ((v - low) / (high - low)) * BAR_AREA_HEIGHT;
  } else {
    const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
    barHeight = (v) => (Math.abs(v) / maxAbs) * BAR_AREA_HEIGHT;
  }

  return (
    <div className="border-b border-slate-200 p-4 dark:border-slate-800">
      <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {item.name} theo kỳ{item.unit ? ` (${item.unit})` : ""}
      </h4>
      <div className="flex items-end gap-2 overflow-x-auto pb-1">
        {order.map((i) => {
          const period = report.periods[i];
          const v = item.values[i];
          const positive = (v ?? 0) >= 0;
          const barPx = v == null ? 0 : Math.max(2, barHeight(v));
          return (
            <div key={period} className="flex min-w-[52px] flex-1 flex-col items-center gap-1">
              <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                {v == null ? "" : formatFinancialValue(v, item.unit)}
              </span>
              <div style={{ height: BAR_AREA_HEIGHT }} className="flex w-full items-end">
                <div
                  className={`w-full rounded-t ${positive ? "bg-slate-1000" : "bg-slate-1000"}`}
                  style={{ height: barPx }}
                />
              </div>
              <span className="whitespace-nowrap text-[10px] text-slate-400 dark:text-slate-500">{period}</span>
            </div>
          );
        })}
      </div>
      {zoomed && (
        <p className="mt-2 text-[10px] italic text-slate-400 dark:text-slate-500">
          * Trục biểu đồ đã phóng theo khoảng giá trị thực tế (không bắt đầu từ 0) để dễ thấy chênh lệch giữa các kỳ.
        </p>
      )}
    </div>
  );
}
