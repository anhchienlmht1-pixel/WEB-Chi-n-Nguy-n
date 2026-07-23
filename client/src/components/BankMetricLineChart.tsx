import { useState } from "react";
import { pickLabelIndices } from "../utils/chartTicks";
import { smoothPath } from "../utils/smoothPath";
import ChartHoverTooltip, { type TooltipRow } from "./ChartHoverTooltip";

const WIDTH = 800;
const HEIGHT = 180;
const PAD = { top: 16, right: 44, bottom: 28, left: 44 };

interface Line {
  label: string;
  color: string;
  values: (number | null)[];
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

// Generic multi-line trend chart for the "Cơ bản" bank ratios — same SVG
// conventions as RatioTrendChart, generalized to an arbitrary set of lines
// so a handful of related ratios (ROE/ROA, NIM/YOEA/COF...) can share one
// chart instead of duplicating this per metric group.
export default function BankMetricLineChart({
  title,
  periods,
  lines,
  formatValue,
}: {
  title: string;
  periods: string[];
  lines: Line[];
  formatValue: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

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

  const step = Math.max(1, Math.ceil(n / 10));
  const labelIndices = new Set(pickLabelIndices(n, step));

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xScale(i) - relX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }
    setHover(nearest);
  }

  const tooltipRows: TooltipRow[] =
    hover === null
      ? []
      : lines.flatMap((l) => {
          const v = l.values[hover];
          if (v == null || !Number.isFinite(v)) return [];
          return [{ label: l.label, color: l.color, value: formatValue(v) }];
        });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        <div className="flex flex-wrap gap-3 text-xs font-medium">
          {lines.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5" style={{ color: l.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative min-w-[560px]">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label={title}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
          >
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
                {formatValue(t)}
              </text>
            ))}

            {periods.map((p, i) =>
              labelIndices.has(i) ? (
                <text
                  key={p}
                  x={xScale(i)}
                  y={HEIGHT - PAD.bottom + 14}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] dark:fill-slate-500"
                >
                  {p}
                </text>
              ) : null
            )}

            {hover !== null && (
              <line
                x1={xScale(hover)}
                x2={xScale(hover)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                className="stroke-slate-300 dark:stroke-slate-600"
                strokeWidth={1}
              />
            )}

            {lines.map((line) => {
              const pts = line.values
                .map((v, i) => (v == null || !Number.isFinite(v) ? null : { x: xScale(i), y: yScale(v) }))
                .filter((p): p is { x: number; y: number } => p !== null);
              return (
                <path
                  key={line.label}
                  d={smoothPath(pts)}
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
                  <circle
                    key={`${line.label}-${i}`}
                    cx={xScale(i)}
                    cy={yScale(v)}
                    r={hover === i ? 4 : 2.5}
                    fill={line.color}
                  />
                )
              )
            )}
          </svg>

          {hover !== null && tooltipRows.length > 0 && (
            <ChartHoverTooltip
              period={periods[hover]}
              rows={tooltipRows}
              leftPercent={Math.min(82, Math.max(18, (xScale(hover) / WIDTH) * 100))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
