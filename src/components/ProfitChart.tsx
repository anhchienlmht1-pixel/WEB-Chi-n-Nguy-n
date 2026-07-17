"use client";

import { useMemo, useState } from "react";
import { FinancialReport } from "@/lib/types";
import { formatFinancialValue } from "@/lib/format";
import { niceTicks, formatCompact } from "@/lib/chart";

// Same up/down convention as the price chart (StockChart.tsx).
const POSITIVE_COLOR = "#059669";
const NEGATIVE_COLOR = "#e11d48";

const W = 640;
const H = 220;
const PAD = { top: 20, right: 12, bottom: 26, left: 44 };

function findProfitItem(report: FinancialReport) {
  const candidates = report.items.filter(
    (it) => /lợi nhuận sau thuế/i.test(it.name) && !/thiểu số|không kiểm soát|cổ đông/i.test(it.name)
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, it) => (it.levels < best.levels ? it : it.name.length < best.name.length ? it : best));
}

export function ProfitChart({ report }: { report: FinancialReport }) {
  const [hover, setHover] = useState<number | null>(null);

  const item = useMemo(() => findProfitItem(report), [report]);

  const points = useMemo(() => {
    if (!item) return [];
    return report.periods.map((label, i) => ({ label, value: item.values[i] }));
  }, [report, item]);

  const hasData = points.some((p) => p.value !== null);
  if (!item || !hasData) return null;

  const values = points.map((p) => p.value ?? 0);
  const domainMin = Math.min(0, ...values);
  const domainMax = Math.max(0, ...values);
  const { min, max, ticks } = niceTicks(domainMin, domainMax, 4);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yFor = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;
  const zeroY = yFor(0);

  const n = points.length;
  const band = plotW / n;
  const barWidth = Math.min(24, band * 0.6);

  const hasNegative = values.some((v) => v < 0);

  return (
    <div className="border-b border-neutral-100 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.name}</h3>
        {item.unit && <span className="text-xs text-neutral-400 dark:text-neutral-500">{item.unit}</span>}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[220px] w-full" role="img" aria-label={item.name}>
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
                className="fill-neutral-400 text-[9px] dark:fill-neutral-500"
              >
                {formatCompact(t)}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            if (p.value === null) return null;
            const x = PAD.left + i * band + (band - barWidth) / 2;
            const y = Math.min(yFor(p.value), zeroY);
            const height = Math.max(1, Math.abs(yFor(p.value) - zeroY));
            const positive = p.value >= 0;
            const isLast = i === n - 1;
            return (
              <g
                key={p.label}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover((h) => (h === i ? null : h))}
                className="cursor-pointer"
              >
                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} fill="transparent" />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx={4}
                  fill={positive ? POSITIVE_COLOR : NEGATIVE_COLOR}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                {isLast && (
                  <text
                    x={x + barWidth / 2}
                    y={positive ? y - 6 : y + height + 12}
                    textAnchor="middle"
                    className="fill-neutral-600 text-[9px] font-medium dark:fill-neutral-300"
                  >
                    {formatCompact(p.value)}
                  </text>
                )}
              </g>
            );
          })}

          {hasNegative && (
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={zeroY}
              y2={zeroY}
              className="stroke-neutral-300 dark:stroke-neutral-700"
              strokeWidth={1}
            />
          )}

          {points.map((p, i) => {
            const x = PAD.left + i * band + band / 2;
            if (n > 12 && i % Math.ceil(n / 12) !== 0 && !(i === n - 1)) return null;
            return (
              <text
                key={p.label}
                x={x}
                y={H - PAD.bottom + 14}
                textAnchor="middle"
                className="fill-neutral-400 text-[9px] dark:fill-neutral-500"
              >
                {p.label}
              </text>
            );
          })}
        </svg>

        {hover !== null && points[hover].value !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-800"
            style={{
              left: `${((PAD.left + hover * band + band / 2) / W) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
              {formatFinancialValue(points[hover].value, item.unit)}
            </div>
            <div className="text-neutral-500 dark:text-neutral-400">{points[hover].label}</div>
          </div>
        )}
      </div>

      {hasNegative && (
        <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
          Xanh: có lãi · Đỏ: lỗ
        </p>
      )}
    </div>
  );
}
