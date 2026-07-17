"use client";

import { useMemo, useRef, useState } from "react";
import { FinancialLineItem, FinancialReport } from "@/lib/types";
import { niceTicks } from "@/lib/chart";
import { useTheme } from "@/lib/theme";

const PE_MATCH = /p\/e/i;
const ROE_MATCH = /\broe\b/i;

function findRatioItem(report: FinancialReport, pattern: RegExp): FinancialLineItem | null {
  const candidates = report.items.filter((it) => pattern.test(it.name));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, it) =>
    it.levels < best.levels ? it : it.levels === best.levels && it.name.length < best.name.length ? it : best
  );
}

const W = 320;
const H = 180;
const PAD = { top: 16, right: 12, bottom: 24, left: 40 };

function formatMetric(value: number, unit: string): string {
  const isPercent = unit === "%";
  return `${value.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${isPercent ? "%" : ""}`;
}

function MetricLineChart({
  title,
  item,
  periods,
  color,
}: {
  title: string;
  item: FinancialLineItem;
  periods: string[];
  color: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const ringColor = theme === "dark" ? "#0a0d0c" : "#ffffff";

  const points = periods.map((label, i) => ({ label, value: item.values[i] }));
  const defined = points.filter((p): p is { label: string; value: number } => p.value !== null);

  if (defined.length === 0) return null;

  const values = defined.map((p) => p.value);
  const { min, max, ticks } = niceTicks(Math.min(...values), Math.max(...values), 4);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const n = points.length;
  const xFor = (i: number) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  const definedIndices = points.map((p, i) => (p.value === null ? -1 : i)).filter((i) => i >= 0);
  const firstIdx = definedIndices[0];
  const lastIdx = definedIndices[definedIndices.length - 1];

  let pathD = "";
  definedIndices.forEach((i, k) => {
    const v = points[i].value as number;
    pathD += `${k === 0 ? "M" : "L"}${xFor(i)},${yFor(v)} `;
  });

  const areaD = `${pathD}L${xFor(lastIdx)},${yFor(min)} L${xFor(firstIdx)},${yFor(min)} Z`;

  const lastDefined = points[lastIdx];
  const lastValue = lastDefined.value as number;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xFor(i) - relX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }
    setHover(nearest);
  }

  const hoverPoint = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{title}</h4>
        <span className="text-xs font-semibold" style={{ color }}>
          {formatMetric(lastValue, item.unit)}
        </span>
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-[180px] w-full"
          role="img"
          aria-label={title}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yFor(t)}
                y2={yFor(t)}
                className="stroke-neutral-200 dark:stroke-neutral-800"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={yFor(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-neutral-400 text-[8px] dark:fill-neutral-500"
              >
                {t.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
              </text>
            </g>
          ))}

          <path d={areaD} fill={color} opacity={0.1} stroke="none" />
          <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hoverPoint && hoverPoint.value !== null && (
            <>
              <line
                x1={xFor(hover!)}
                x2={xFor(hover!)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                className="stroke-neutral-300 dark:stroke-neutral-600"
                strokeWidth={1}
              />
              <circle
                cx={xFor(hover!)}
                cy={yFor(hoverPoint.value)}
                r={4}
                fill={color}
                stroke={ringColor}
                strokeWidth={2}
              />
            </>
          )}

          {hover === null && (
            <circle cx={xFor(lastIdx)} cy={yFor(lastValue)} r={4} fill={color} stroke={ringColor} strokeWidth={2} />
          )}

          {[0, n - 1].map((i) => (
            <text
              key={i}
              x={xFor(i)}
              y={H - PAD.bottom + 14}
              textAnchor={i === 0 ? "start" : "end"}
              className="fill-neutral-400 text-[8px] dark:fill-neutral-500"
            >
              {points[i].label}
            </text>
          ))}
        </svg>

        {hoverPoint && hoverPoint.value !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] shadow-md dark:border-neutral-700 dark:bg-neutral-800"
            style={{ left: `${(xFor(hover!) / W) * 100}%`, transform: "translateX(-50%)" }}
          >
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
              {formatMetric(hoverPoint.value, item.unit)}
            </div>
            <div className="text-neutral-500 dark:text-neutral-400">{hoverPoint.label}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function RatioTrendChart({ report }: { report: FinancialReport }) {
  const pe = useMemo(() => findRatioItem(report, PE_MATCH), [report]);
  const roe = useMemo(() => findRatioItem(report, ROE_MATCH), [report]);

  if (!pe && !roe) return null;

  return (
    <div className="grid grid-cols-1 gap-4 border-b border-neutral-100 p-4 dark:border-neutral-800 sm:grid-cols-2">
      {pe && <MetricLineChart title={pe.name} item={pe} periods={report.periods} color="#27857a" />}
      {roe && <MetricLineChart title={roe.name} item={roe} periods={report.periods} color="#eb6834" />}
    </div>
  );
}
