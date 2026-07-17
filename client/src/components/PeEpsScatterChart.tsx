import { useNavigate } from "react-router-dom";
import type { PeEpsPoint } from "../utils/screener";

const WIDTH = 800;
const HEIGHT = 460;
const PAD = { top: 20, right: 24, bottom: 44, left: 56 };

function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export default function PeEpsScatterChart({ points }: { points: PeEpsPoint[] }) {
  const navigate = useNavigate();
  if (points.length === 0) return null;

  const pes = points.map((p) => p.pe);
  const growths = points.map((p) => p.epsGrowthPercent);
  const xMin = Math.min(0, ...pes);
  const xMax = Math.max(...pes) * 1.05 || 1;
  const yMin = Math.min(...growths) * (Math.min(...growths) < 0 ? 1.1 : 0.9);
  const yMax = Math.max(...growths) * 1.1 || 1;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const xScale = (pe: number) => PAD.left + ((pe - xMin) / (xMax - xMin || 1)) * plotW;
  const yScale = (g: number) => PAD.top + (1 - (g - yMin) / (yMax - yMin || 1)) * plotH;

  const xTicks = niceTicks(xMin, xMax);
  const yTicks = niceTicks(yMin, yMax);
  const zeroY = yMin <= 0 && yMax >= 0 ? yScale(0) : null;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[560px]" role="img">
        {/* gridlines */}
        {yTicks.map((t) => (
          <line
            key={`gy-${t}`}
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={yScale(t)}
            y2={yScale(t)}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={1}
          />
        ))}
        {xTicks.map((t) => (
          <line
            key={`gx-${t}`}
            x1={xScale(t)}
            x2={xScale(t)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={1}
          />
        ))}

        {/* zero-growth reference line */}
        {zeroY != null && (
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={zeroY}
            y2={zeroY}
            className="stroke-slate-400 dark:stroke-slate-600"
            strokeWidth={1.5}
          />
        )}

        {/* axes */}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={HEIGHT - PAD.bottom}
          y2={HEIGHT - PAD.bottom}
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeWidth={1.5}
        />
        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={HEIGHT - PAD.bottom}
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeWidth={1.5}
        />

        {xTicks.map((t) => (
          <text
            key={`xl-${t}`}
            x={xScale(t)}
            y={HEIGHT - PAD.bottom + 18}
            textAnchor="middle"
            className="fill-slate-500 text-[11px] dark:fill-slate-400"
          >
            {t.toFixed(1)}
          </text>
        ))}
        {yTicks.map((t) => (
          <text
            key={`yl-${t}`}
            x={PAD.left - 10}
            y={yScale(t) + 4}
            textAnchor="end"
            className="fill-slate-500 text-[11px] dark:fill-slate-400"
          >
            {t.toFixed(0)}%
          </text>
        ))}

        <text
          x={(PAD.left + WIDTH - PAD.right) / 2}
          y={HEIGHT - 6}
          textAnchor="middle"
          className="fill-slate-500 text-xs font-medium dark:fill-slate-400"
        >
          P/E
        </text>
        <text
          x={16}
          y={(PAD.top + HEIGHT - PAD.bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${(PAD.top + HEIGHT - PAD.bottom) / 2})`}
          className="fill-slate-500 text-xs font-medium dark:fill-slate-400"
        >
          Tăng trưởng EPS (%)
        </text>

        {points.map((p) => (
          <g
            key={p.symbol}
            className="cursor-pointer"
            onClick={() => navigate(`/stock/${p.symbol}`)}
          >
            <circle
              cx={xScale(p.pe)}
              cy={yScale(p.epsGrowthPercent)}
              r={6}
              fill={p.epsGrowthPercent >= 0 ? "#10b981" : "#ef4444"}
              fillOpacity={0.75}
              stroke={p.epsGrowthPercent >= 0 ? "#059669" : "#dc2626"}
              strokeWidth={1}
            >
              <title>
                {p.symbol}: P/E {p.pe.toFixed(1)}, tăng trưởng EPS {p.epsGrowthPercent >= 0 ? "+" : ""}
                {p.epsGrowthPercent.toFixed(1)}%
              </title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}
