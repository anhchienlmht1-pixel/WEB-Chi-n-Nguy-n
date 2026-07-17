import { useMemo, useState } from "react";
import { fetchFinancials } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { FinancialPeriodType } from "../types";
import { PE_MATCH, findRatioItem } from "../utils/ratios";
import { sortPeriodIndices } from "../utils/period";
import { pickLabelIndices } from "../utils/chartTicks";

const WIDTH = 800;
const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };
const PE_COLOR = "#f59e0b";
const AVG_COLOR = "#ef4444";

export default function ValuationChart({ symbol }: { symbol: string }) {
  const [periodType, setPeriodType] = useState<FinancialPeriodType>("quarter");

  const { data, error, loading } = usePolling(
    () => fetchFinancials(symbol, "CSTC", periodType),
    [symbol, periodType]
  );

  const chart = useMemo(() => {
    if (!data) return null;
    const peItem = findRatioItem(data, PE_MATCH);
    if (!peItem) return null;

    const order = sortPeriodIndices(data.periods, "asc");
    const labels = order.map((i) => data.periods[i]);
    const values = order.map((i) => peItem.values[i]);
    const defined = values.filter((v): v is number => v != null && Number.isFinite(v));
    if (defined.length < 2) return null;

    const average = defined.reduce((a, b) => a + b, 0) / defined.length;
    const latest = defined[defined.length - 1];
    const unit = peItem.unit || "Lần";

    return { labels, values, average, latest, unit };
  }, [data]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Định giá P/E theo thời gian</h4>
          {chart && (
            <span className="text-sm font-bold tabular-nums" style={{ color: PE_COLOR }}>
              {chart.latest.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {(["quarter", "year"] as FinancialPeriodType[]).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setPeriodType(pt)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                periodType === pt
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {pt === "quarter" ? "Quý" : "Năm"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="h-[200px] animate-pulse rounded bg-slate-100 dark:bg-slate-800" />}

      {!loading && (error || !chart) && (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Chưa có đủ dữ liệu P/E theo thời gian cho {symbol}.
        </p>
      )}

      {!loading && chart && <PeLine {...chart} />}
    </div>
  );
}

function PeLine({
  labels,
  values,
  average,
  unit,
}: {
  labels: string[];
  values: (number | null)[];
  average: number;
  latest: number;
  unit: string;
}) {
  const defined = values.filter((v): v is number => v != null && Number.isFinite(v));
  const min = Math.min(average, ...defined);
  const max = Math.max(average, ...defined);
  const pad = (max - min) * 0.15 || 1;
  const lo = Math.max(0, min - pad);
  const hi = max + pad;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const n = labels.length;
  const xScale = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yScale = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  const pts = values
    .map((v, i) => (v == null ? null : `${xScale(i)},${yScale(v)}`))
    .filter((p): p is string => p !== null)
    .join(" ");

  const step = Math.max(1, Math.ceil(n / 10));
  const labelIndices = new Set(pickLabelIndices(n, step));

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 flex gap-4 text-xs font-medium">
        <span className="flex items-center gap-1.5" style={{ color: PE_COLOR }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PE_COLOR }} />
          P/E ({unit})
        </span>
        <span className="flex items-center gap-1.5" style={{ color: AVG_COLOR }}>
          <span className="h-2 w-0.5" style={{ backgroundColor: AVG_COLOR }} />
          Trung bình ({average.toFixed(2)})
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[560px]" role="img">
        {[lo, (lo + hi) / 2, hi].map((t) => (
          <text
            key={t}
            x={PAD.left - 8}
            y={yScale(t) + 3}
            textAnchor="end"
            className="fill-slate-500 text-[10px] dark:fill-slate-400"
          >
            {t.toFixed(1)}
          </text>
        ))}

        {labels.map((label, i) =>
          labelIndices.has(i) ? (
            <text
              key={label}
              x={xScale(i)}
              y={HEIGHT - PAD.bottom + 14}
              textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}
              className="fill-slate-400 text-[10px] dark:fill-slate-500"
            >
              {label}
            </text>
          ) : null
        )}

        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={yScale(average)}
          y2={yScale(average)}
          stroke={AVG_COLOR}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />

        <polyline points={pts} fill="none" stroke={PE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {values.map((v, i) =>
          v == null ? null : (
            <circle key={labels[i]} cx={xScale(i)} cy={yScale(v)} r={2.5} fill={PE_COLOR}>
              <title>
                {labels[i]} — P/E: {v.toFixed(2)} {unit}
              </title>
            </circle>
          )
        )}
      </svg>
    </div>
  );
}
