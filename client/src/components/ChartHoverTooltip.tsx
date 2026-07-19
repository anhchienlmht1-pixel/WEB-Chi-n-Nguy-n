export interface TooltipRow {
  label: string;
  color: string;
  value: string;
  /** "line" renders the swatch as a line segment (for overlay/growth lines). */
  shape?: "dot" | "line";
}

// Floating tooltip shared by the dashboard SVG charts (BankMetricLineChart,
// BankStackedBarChart). Purely presentational — each chart owns its hover
// state and computes the rows; this just renders the panel. Positioned by
// percentage of chart width so it tracks the hovered column regardless of
// the rendered pixel size.
export default function ChartHoverTooltip({
  period,
  rows,
  total,
  leftPercent,
}: {
  period: string;
  rows: TooltipRow[];
  total?: { label: string; value: string };
  leftPercent: number;
}) {
  return (
    <div
      className="pointer-events-none absolute top-1 z-20 min-w-[170px] max-w-[280px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95"
      style={{ left: `${leftPercent}%`, transform: "translateX(-50%)" }}
    >
      <div className="font-semibold text-slate-900 dark:text-slate-100">{period}</div>
      {total && (
        <div className="mt-1 flex items-center justify-between gap-4 border-b border-slate-200 pb-1 font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
          <span>{total.label}</span>
          <span className="tabular-nums">{total.value}</span>
        </div>
      )}
      <div className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={`inline-block shrink-0 ${r.shape === "line" ? "h-0.5 w-2.5" : "h-2 w-2 rounded-full"}`}
                style={{ backgroundColor: r.color }}
              />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-slate-900 dark:text-slate-100">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
