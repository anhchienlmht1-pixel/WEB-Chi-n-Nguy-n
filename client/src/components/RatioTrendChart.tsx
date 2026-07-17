import type { FinancialReport } from "../types";
import { PE_MATCH, ROE_MATCH, findRatioItem } from "../utils/ratios";
import { sortPeriodIndices } from "../utils/period";

const WIDTH = 800;
const HEIGHT = 220;
const PAD = { top: 16, right: 44, bottom: 28, left: 44 };

interface Line {
  label: string;
  unit: string;
  color: string;
  values: (number | null)[];
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export default function RatioTrendChart({ report }: { report: FinancialReport }) {
  const peItem = findRatioItem(report, PE_MATCH);
  const roeItem = findRatioItem(report, ROE_MATCH);
  if (!peItem && !roeItem) return null;

  // Chart timelines always read oldest (left) -> newest (right), regardless
  // of whatever order KBS's raw period array happens to be in.
  const order = sortPeriodIndices(report.periods, "asc");
  const periods = order.map((i) => report.periods[i]);

  const lines: Line[] = [];
  if (peItem) lines.push({ label: "P/E", unit: peItem.unit || "Lần", color: "#f59e0b", values: order.map((i) => peItem.values[i]) });
  if (roeItem) lines.push({ label: "ROE", unit: roeItem.unit || "%", color: "#10b981", values: order.map((i) => roeItem.values[i]) });

  const allValues = lines.flatMap((l) => l.values.filter((v): v is number => v != null && Number.isFinite(v)));
  if (allValues.length < 2) return null;

  const min = Math.min(0, ...allValues);
  const max = Math.max(...allValues) * 1.1 || 1;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const n = periods.length;

  const xScale = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yScale = (v: number) => PAD.top + (1 - (v - min) / (max - min || 1)) * plotH;
  const yTicks = niceTicks(min, max);

  return (
    <div className="border-b border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Xu hướng P/E &amp; ROE theo kỳ</h4>
        <div className="flex gap-3 text-xs font-medium">
          {lines.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5" style={{ color: l.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label} ({l.unit})
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[560px]" role="img">
          {yTicks.map((t) => (
            <line
              key={t}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yScale(t)}
              y2={yScale(t)}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth={1}
            />
          ))}
          {yTicks.map((t) => (
            <text
              key={`l-${t}`}
              x={PAD.left - 8}
              y={yScale(t) + 3}
              textAnchor="end"
              className="fill-slate-500 text-[10px] dark:fill-slate-400"
            >
              {t.toFixed(0)}
            </text>
          ))}

          {periods.map((p, i) => (
            <text
              key={p}
              x={xScale(i)}
              y={HEIGHT - PAD.bottom + 14}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] dark:fill-slate-500"
            >
              {p}
            </text>
          ))}

          {lines.map((line) => {
            const pts = line.values
              .map((v, i) => (v == null || !Number.isFinite(v) ? null : `${xScale(i)},${yScale(v)}`))
              .filter((p): p is string => p !== null);
            return (
              <polyline
                key={line.label}
                points={pts.join(" ")}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}

          {lines.map((line) =>
            line.values.map((v, i) =>
              v == null || !Number.isFinite(v) ? null : (
                <circle key={`${line.label}-${i}`} cx={xScale(i)} cy={yScale(v)} r={3} fill={line.color}>
                  <title>
                    {periods[i]} — {line.label}: {v.toFixed(2)} {line.unit}
                  </title>
                </circle>
              )
            )
          )}
        </svg>
      </div>
    </div>
  );
}
