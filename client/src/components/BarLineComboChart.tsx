import { pickLabelIndices } from "../utils/chartTicks";
import { periodGrowth } from "../utils/financials";

const WIDTH = 560;
const HEIGHT = 220;
const PAD = { top: 16, right: 40, bottom: 26, left: 44 };
const BAR_COLOR = "#3b82f6";
const LINE_COLOR = "#a78bfa";

// Matches the bar (absolute value) + line (growth %) combo used by every VN
// brokerage's own financial-report dashboards (KAFI, FiinTrade, VNDirect...)
// — two y-axes by design here, since that's the specific, well-established
// convention being replicated, not a generic chart.
export default function BarLineComboChart({
  title,
  periods,
  values,
  unit,
  sourceLabel,
}: {
  title: string;
  periods: string[];
  values: (number | null)[];
  unit: string;
  sourceLabel?: string;
}) {
  const growth = periodGrowth(values);
  const definedValues = values.filter((v): v is number => v != null && Number.isFinite(v));
  const definedGrowth = growth.filter((v): v is number => v != null && Number.isFinite(v));
  if (definedValues.length < 2) return null;

  const n = periods.length;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const barMin = Math.min(0, ...definedValues);
  const barMax = Math.max(0, ...definedValues) * 1.1 || 1;
  const barY = (v: number) => PAD.top + (1 - (v - barMin) / (barMax - barMin || 1)) * plotH;

  const lineMin = definedGrowth.length ? Math.min(0, ...definedGrowth) : -1;
  const lineMax = definedGrowth.length ? Math.max(0, ...definedGrowth) * 1.1 || 1 : 1;
  const lineY = (v: number) => PAD.top + (1 - (v - lineMin) / (lineMax - lineMin || 1)) * plotH;

  const band = plotW / n;
  const barWidth = Math.min(28, band * 0.5);
  const xCenter = (i: number) => PAD.left + i * band + band / 2;

  const linePts = growth
    .map((v, i) => (v == null ? null : `${xCenter(i)},${lineY(v)}`))
    .filter((p): p is string => p !== null)
    .join(" ");

  const step = Math.max(1, Math.ceil(n / 8));
  const labelIndices = new Set(pickLabelIndices(n, step));
  const barTicks = [barMin, (barMin + barMax) / 2, barMax];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        <div className="flex gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: BAR_COLOR }} />
            {unit || "Giá trị"}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="h-0.5 w-2.5" style={{ backgroundColor: LINE_COLOR }} />
            Tăng trưởng (%)
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[420px]" role="img" aria-label={title}>
          {barTicks.map((t) => (
            <text
              key={`bl-${t}`}
              x={PAD.left - 6}
              y={barY(t) + 3}
              textAnchor="end"
              className="fill-slate-500 text-[9px] dark:fill-slate-400"
            >
              {t.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 })}
            </text>
          ))}

          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={barY(0)}
            y2={barY(0)}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={1}
          />

          {values.map((v, i) =>
            v == null ? null : (
              <rect
                key={periods[i]}
                x={xCenter(i) - barWidth / 2}
                y={Math.min(barY(v), barY(0))}
                width={barWidth}
                height={Math.max(1, Math.abs(barY(v) - barY(0)))}
                rx={2}
                fill={BAR_COLOR}
              >
                <title>
                  {periods[i]} — {title}: {v.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} {unit}
                </title>
              </rect>
            )
          )}

          <polyline points={linePts} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {growth.map((v, i) =>
            v == null ? null : (
              <circle key={`g-${periods[i]}`} cx={xCenter(i)} cy={lineY(v)} r={2.5} fill={LINE_COLOR}>
                <title>
                  {periods[i]} — Tăng trưởng: {v.toFixed(1)}%
                </title>
              </circle>
            )
          )}

          {[lineMin, lineMax].map((t) => (
            <text
              key={`lr-${t}`}
              x={WIDTH - PAD.right + 6}
              y={lineY(t) + 3}
              textAnchor="start"
              className="fill-slate-500 text-[9px] dark:fill-slate-400"
            >
              {t.toFixed(0)}%
            </text>
          ))}

          {periods.map((p, i) =>
            labelIndices.has(i) ? (
              <text
                key={p}
                x={xCenter(i)}
                y={HEIGHT - PAD.bottom + 14}
                textAnchor="middle"
                className="fill-slate-400 text-[9px] dark:fill-slate-500"
              >
                {p}
              </text>
            ) : null
          )}
        </svg>
      </div>
      {sourceLabel && <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{sourceLabel}</p>}
    </div>
  );
}

