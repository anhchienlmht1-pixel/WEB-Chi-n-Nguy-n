import type { FinancialReport } from "../types";
import { formatFinancialValue } from "../utils/format";

const BAR_AREA_HEIGHT = 120;

// KBS doesn't document exact KQKD row IDs, so the net-profit line is found
// by name match — prefer the top-level (least indented) row when several
// "lợi nhuận sau thuế" rows exist (e.g. consolidated vs. parent-company-only).
function findProfitItem(report: FinancialReport) {
  const candidates = report.items.filter((it) => /lợi nhuận sau thuế/i.test(it.name));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.levels - b.levels || a.name.length - b.name.length)[0];
}

export default function ProfitChart({ report }: { report: FinancialReport }) {
  const item = findProfitItem(report);
  if (!item) return null;

  const maxAbs = Math.max(1, ...item.values.map((v) => Math.abs(v ?? 0)));

  return (
    <div className="border-b border-slate-200 p-4 dark:border-slate-800">
      <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {item.name} theo kỳ{item.unit ? ` (${item.unit})` : ""}
      </h4>
      <div className="flex items-end gap-2 overflow-x-auto pb-1">
        {report.periods.map((period, i) => {
          const v = item.values[i];
          const positive = (v ?? 0) >= 0;
          const barPx = v == null ? 0 : Math.max(2, (Math.abs(v) / maxAbs) * BAR_AREA_HEIGHT);
          return (
            <div key={period} className="flex min-w-[52px] flex-1 flex-col items-center gap-1">
              <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                {v == null ? "" : formatFinancialValue(v, item.unit)}
              </span>
              <div style={{ height: BAR_AREA_HEIGHT }} className="flex w-full items-end">
                <div
                  className={`w-full rounded-t ${positive ? "bg-emerald-500" : "bg-red-500"}`}
                  style={{ height: barPx }}
                />
              </div>
              <span className="whitespace-nowrap text-[10px] text-slate-400 dark:text-slate-500">{period}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
