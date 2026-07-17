import { useNavigate } from "react-router-dom";
import type { PerformanceItem } from "../pages/PerformanceCompare";

export default function PerformanceBarChart({ items }: { items: PerformanceItem[] }) {
  const navigate = useNavigate();
  const maxAbs = Math.max(1, ...items.map((it) => Math.abs(it.returnPercent)));

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const widthPct = (Math.abs(it.returnPercent) / maxAbs) * 50;
        const positive = it.returnPercent >= 0;
        return (
          <button
            key={it.symbol}
            type="button"
            onClick={() => navigate(`/stock/${it.symbol}`)}
            className="flex w-full items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span className="w-16 shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {it.symbol}
            </span>
            <span className="relative h-5 flex-1 rounded bg-slate-100 dark:bg-slate-800">
              <span className="absolute inset-y-0 left-1/2 w-px bg-slate-300 dark:bg-slate-600" />
              <span
                className={`absolute inset-y-0 rounded ${positive ? "left-1/2 bg-emerald-500" : "right-1/2 bg-red-500"}`}
                style={{ width: `${widthPct}%` }}
              />
            </span>
            <span
              className={`w-16 shrink-0 text-right text-sm font-medium tabular-nums ${
                positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
              }`}
            >
              {positive ? "+" : ""}
              {it.returnPercent.toFixed(1)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}
