import { useState } from "react";
import type { PbStat } from "../utils/pbHistory";
import ChartHoverTooltip, { type TooltipRow } from "./ChartHoverTooltip";

const WIDTH = 900;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

// Three deliberately contrasting hues (blue / green / red) so Range,
// Average, and current P/B stay visually distinct at a glance — Average
// keeps the site's primary emerald, Range moved off its old washed-out
// gray to a blue that reads clearly against both the markers and the page.
const COLOR_RANGE = "#3b82f6";
const COLOR_AVERAGE = "#10b981";
const COLOR_CURRENT = "#dc2626";

function formatPb(v: number): string {
  return v.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Range/floating-marker chart matching the "SO SÁNH P/B NGÀNH NGÂN HÀNG" /
// "SO SÁNH P/B NGÀNH CHỨNG KHOÁN" layout: a gray bar spans each symbol's
// min–max P/B over the selected lookback window, a blue square marks the
// window's average, and a red diamond marks today's P/B (which can sit
// outside the gray range, since today isn't necessarily within the
// historical min/max).
export default function PbRangeChart({ data, title }: { data: PbStat[]; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;

  const allValues = data.flatMap((d) => [d.min, d.max, d.average, d.current]).filter(
    (v): v is number => v != null && Number.isFinite(v)
  );
  if (allValues.length === 0) return null;

  const yMax = Math.max(...allValues) * 1.15 || 1;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + (1 - v / yMax) * plotH;

  const band = plotW / n;
  const barWidth = Math.min(36, band * 0.4);
  const xCenter = (i: number) => PAD.left + i * band + band / 2;

  const ticks = [0, yMax / 2, yMax];

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xCenter(i) - relX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }
    setHover(nearest);
  }

  const tooltipRows: TooltipRow[] = [];
  if (hover !== null) {
    const d = data[hover];
    if (d.average != null) tooltipRows.push({ label: "Average", color: COLOR_AVERAGE, value: formatPb(d.average) });
    if (d.current != null) tooltipRows.push({ label: "P/B", color: COLOR_CURRENT, value: formatPb(d.current) });
    if (d.min != null && d.max != null) {
      tooltipRows.push({ label: "Range", color: COLOR_RANGE, value: `${formatPb(d.min)} – ${formatPb(d.max)}` });
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: COLOR_AVERAGE }} />
            Average
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rotate-45" style={{ backgroundColor: COLOR_CURRENT }} />
            P/B
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: COLOR_RANGE }} />
            Range
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[700px]">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label={title}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={`tick-${t}`}>
                <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-500 text-[9px] dark:fill-slate-400">
                  {formatPb(t)}
                </text>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth={1}
                />
              </g>
            ))}

            {hover !== null && (
              <line
                x1={xCenter(hover)}
                x2={xCenter(hover)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                className="stroke-slate-300 dark:stroke-slate-600"
                strokeWidth={1}
              />
            )}

            {data.map((d, i) => (
              <g key={d.symbol} opacity={hover === null || hover === i ? 1 : 0.5}>
                {d.min != null && d.max != null && (
                  <rect
                    x={xCenter(i) - barWidth / 2}
                    y={y(d.max)}
                    width={barWidth}
                    height={Math.max(1, y(d.min) - y(d.max))}
                    fill={COLOR_RANGE}
                    fillOpacity={0.35}
                    rx={2}
                  />
                )}
                {d.average != null && (
                  <rect
                    x={xCenter(i) - 5}
                    y={y(d.average) - 5}
                    width={10}
                    height={10}
                    fill={COLOR_AVERAGE}
                  />
                )}
                {d.current != null && (
                  <rect
                    x={xCenter(i) - 5}
                    y={y(d.current) - 5}
                    width={10}
                    height={10}
                    fill={COLOR_CURRENT}
                    transform={`rotate(45 ${xCenter(i)} ${y(d.current)})`}
                  />
                )}
              </g>
            ))}

            {data.map((d, i) => (
              <text
                key={`label-${d.symbol}`}
                x={xCenter(i)}
                y={HEIGHT - PAD.bottom + 14}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-medium dark:fill-slate-400"
              >
                {d.symbol}
              </text>
            ))}
          </svg>

          {hover !== null && tooltipRows.length > 0 && (
            <ChartHoverTooltip
              period={data[hover].symbol}
              rows={tooltipRows}
              leftPercent={Math.min(88, Math.max(12, (xCenter(hover) / WIDTH) * 100))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
