import { pickLabelIndices } from "../utils/chartTicks";
import { formatDetailTooltip, formatDetailValue, type BankMetricFormat } from "../utils/bankDetailFormat";

const WIDTH = 800;
const HEIGHT = 240;
const PAD = { top: 16, right: 44, bottom: 28, left: 44 };

interface Series {
  label: string;
  color: string;
  values: (number | null)[];
}

// Covers three of the "Chi tiết mã ngân hàng" chart kinds that all share
// one stacked-bar skeleton: a 100%-stacked composition (stackedShare, e.g.
// "Tỷ trọng cho vay theo ngành"), a plain absolute stacked bar
// (stackedBar, e.g. "Các khoản dự phòng"), and a stacked bar with growth%
// line(s) on a secondary axis (comboBarLine, e.g. "Thu nhập hoạt động") —
// the last is the same brokerage bar+line convention as BarLineComboChart,
// just generalized from one bar series to N stacked ones.
export default function BankStackedBarChart({
  title,
  periods,
  bars,
  mode,
  lines = [],
  format,
  lineFormat = "percent",
}: {
  title: string;
  periods: string[];
  bars: Series[];
  mode: "share" | "absolute";
  lines?: Series[];
  format: BankMetricFormat;
  lineFormat?: BankMetricFormat;
}) {
  const n = periods.length;

  // In "share" mode a period is only plotted if every component has a
  // value — a partial stack (some sectors reported, some not) would
  // misrepresent the composition rather than just show a gap.
  const stacks: (number[] | null)[] = [];
  for (let i = 0; i < n; i++) {
    if (mode === "share") {
      const vals = bars.map((b) => b.values[i]);
      stacks.push(vals.some((v) => v == null) ? null : (vals as number[]));
    } else {
      stacks.push(bars.map((b) => b.values[i] ?? 0));
    }
  }

  const totals = stacks.map((s) => (s ? s.reduce((a, b) => a + b, 0) : null));
  const definedTotals = totals.filter((v): v is number => v != null && Number.isFinite(v));
  if (definedTotals.length < 2) return null;

  const barMax = mode === "share" ? 1 : Math.max(0, ...definedTotals) * 1.1 || 1;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const barY = (v: number) => PAD.top + (1 - v / barMax) * plotH;

  const definedLineValues = lines.flatMap((l) => l.values.filter((v): v is number => v != null && Number.isFinite(v)));
  const lineMin = definedLineValues.length ? Math.min(0, ...definedLineValues) : 0;
  const lineMax = definedLineValues.length ? Math.max(0, ...definedLineValues) * 1.1 || 1 : 1;
  const lineY = (v: number) => PAD.top + (1 - (v - lineMin) / (lineMax - lineMin || 1)) * plotH;

  const band = plotW / n;
  const barWidth = Math.min(28, band * 0.6);
  const xCenter = (i: number) => PAD.left + i * band + band / 2;

  const step = Math.max(1, Math.ceil(n / 10));
  const labelIndices = new Set(pickLabelIndices(n, step));
  const barTicks = mode === "share" ? [0, 0.5, 1] : [0, barMax / 2, barMax];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        <div className="flex flex-wrap gap-3 text-xs font-medium">
          {bars.map((b) => (
            <span key={b.label} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: b.color }} />
              {b.label}
            </span>
          ))}
          {lines.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5" style={{ color: l.color }}>
              <span className="h-0.5 w-2.5" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[560px]" role="img" aria-label={title}>
          {barTicks.map((t) => (
            <text
              key={`bt-${t}`}
              x={PAD.left - 6}
              y={barY(t) + 3}
              textAnchor="end"
              className="fill-slate-500 text-[9px] dark:fill-slate-400"
            >
              {formatDetailValue(t, format)}
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

          {stacks.map((stack, i) => {
            if (!stack) return null;
            let acc = 0;
            return (
              <g key={periods[i]}>
                {stack.map((v, bi) => {
                  const y0 = barY(acc);
                  acc += v;
                  const y1 = barY(acc);
                  return (
                    <rect
                      key={bi}
                      x={xCenter(i) - barWidth / 2}
                      y={Math.min(y0, y1)}
                      width={barWidth}
                      height={Math.max(0, Math.abs(y1 - y0))}
                      fill={bars[bi].color}
                    >
                      <title>
                        {periods[i]} — {bars[bi].label}: {formatDetailTooltip(v, format)}
                      </title>
                    </rect>
                  );
                })}
              </g>
            );
          })}

          {lines.map((line) => {
            const pts = line.values
              .map((v, i) => (v == null || !Number.isFinite(v) ? null : `${xCenter(i)},${lineY(v)}`))
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
                <circle key={`${line.label}-${i}`} cx={xCenter(i)} cy={lineY(v)} r={2.5} fill={line.color}>
                  <title>
                    {periods[i]} — {line.label}: {formatDetailTooltip(v, lineFormat)}
                  </title>
                </circle>
              )
            )
          )}
          {lines.length > 0 &&
            [lineMin, lineMax].map((t) => (
              <text
                key={`lr-${t}`}
                x={WIDTH - PAD.right + 6}
                y={lineY(t) + 3}
                textAnchor="start"
                className="fill-slate-500 text-[9px] dark:fill-slate-400"
              >
                {formatDetailValue(t, lineFormat)}
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
    </div>
  );
}
