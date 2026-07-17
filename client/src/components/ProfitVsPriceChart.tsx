import { useMemo, useState } from "react";
import { fetchFinancials, fetchHistory } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { HistoryPoint } from "../types";
import { findProfitItem } from "../utils/financials";
import { periodEndDate, sortPeriodIndices } from "../utils/period";
import { pickLabelIndices } from "../utils/chartTicks";

const WIDTH = 800;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

const PROFIT_COLOR = "#10b981";
const PRICE_COLOR = "#3b82f6";

const RANGES = [
  { value: "1Y", label: "1N" },
  { value: "5Y", label: "5N" },
  { value: "MAX", label: "Tối đa" },
] as const;
type Range = (typeof RANGES)[number]["value"];

function nearestPriceOnOrBefore(points: HistoryPoint[], date: Date): number | null {
  let best: number | null = null;
  for (const p of points) {
    const t = new Date(p.time).getTime();
    if (t <= date.getTime()) best = p.close;
    else break;
  }
  return best;
}

// Quarterly profit and daily price live at completely different scales and
// granularities, so plotting them together only makes sense indexed to a
// common base (= 100 at the first period both have data for) rather than as
// a literal dual-axis overlay — that would just be two arbitrary y-scales
// picked to make the lines look related.
export default function ProfitVsPriceChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<Range>("5Y");

  const { data, error, loading } = usePolling(
    async () => {
      const [historyRes, kqkd] = await Promise.all([
        fetchHistory(symbol, range),
        fetchFinancials(symbol, "KQKD", "quarter"),
      ]);
      return { points: historyRes.points, kqkd };
    },
    [symbol, range]
  );

  const chart = useMemo(() => {
    if (!data) return null;
    const profitItem = findProfitItem(data.kqkd);
    if (!profitItem) return null;

    const sortedPoints = [...data.points].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    if (sortedPoints.length === 0) return null;

    const order = sortPeriodIndices(data.kqkd.periods, "asc");
    const combined = order
      .map((i) => {
        const label = data.kqkd.periods[i];
        const endDate = periodEndDate(label);
        if (!endDate) return null;
        const price = nearestPriceOnOrBefore(sortedPoints, endDate);
        if (price === null) return null;
        return { label, profit: profitItem.values[i], price };
      })
      .filter((p): p is { label: string; profit: number | null; price: number } => p !== null);

    // Index growth (%) needs a positive base period — a loss-making
    // starting quarter makes "% of base" meaningless, so start from the
    // first profitable period instead of forcing the chart's hand.
    const baseIdx = combined.findIndex((p) => p.profit != null && p.profit > 0);
    if (baseIdx === -1) return null;
    const trimmed = combined.slice(baseIdx);
    if (trimmed.length < 2) return null;

    const baseProfit = trimmed[0].profit as number;
    const basePrice = trimmed[0].price;

    return {
      labels: trimmed.map((p) => p.label),
      profit: trimmed.map((p) => (p.profit == null ? null : (p.profit / baseProfit) * 100)),
      price: trimmed.map((p) => (p.price / basePrice) * 100),
    };
  }, [data]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Tăng trưởng lợi nhuận so với giá cổ phiếu
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Quy về mốc 100 tại kỳ lợi nhuận dương gần nhất đầu chuỗi — so sánh tốc độ tăng trưởng, không phải giá trị tuyệt đối.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                range === r.value
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="h-[240px] animate-pulse rounded bg-slate-100 dark:bg-slate-800" />}

      {!loading && (error || !chart) && (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Chưa đủ dữ liệu để so sánh (cần cả lịch sử giá và lợi nhuận theo quý ở cùng giai đoạn).
        </p>
      )}

      {!loading && chart && <GrowthLines labels={chart.labels} profit={chart.profit} price={chart.price} />}
    </div>
  );
}

function GrowthLines({
  labels,
  profit,
  price,
}: {
  labels: string[];
  profit: (number | null)[];
  price: number[];
}) {
  const allValues = [...profit.filter((v): v is number => v != null), ...price];
  const min = Math.min(100, ...allValues);
  const max = Math.max(100, ...allValues);
  const pad = (max - min) * 0.1 || 10;
  const lo = min - pad;
  const hi = max + pad;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const n = labels.length;
  const xScale = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yScale = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  const yTicks = [lo, (lo + hi) / 2, hi];

  const profitPts = profit
    .map((v, i) => (v == null ? null : `${xScale(i)},${yScale(v)}`))
    .filter((p): p is string => p !== null)
    .join(" ");
  const pricePts = price.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" ");

  const step = Math.max(1, Math.ceil(n / 10));
  const labelIndices = new Set(pickLabelIndices(n, step));

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 flex gap-4 text-xs font-medium">
        <span className="flex items-center gap-1.5" style={{ color: PROFIT_COLOR }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROFIT_COLOR }} />
          Lợi nhuận sau thuế (theo quý)
        </span>
        <span className="flex items-center gap-1.5" style={{ color: PRICE_COLOR }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRICE_COLOR }} />
          Giá cổ phiếu
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[560px]" role="img">
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={yScale(100)}
          y2={yScale(100)}
          className="stroke-slate-300 dark:stroke-slate-700"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {yTicks.map((t) => (
          <text
            key={t}
            x={PAD.left - 8}
            y={yScale(t) + 3}
            textAnchor="end"
            className="fill-slate-500 text-[10px] dark:fill-slate-400"
          >
            {t.toFixed(0)}%
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

        <polyline points={pricePts} fill="none" stroke={PRICE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={profitPts} fill="none" stroke={PROFIT_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {price.map((v, i) => (
          <circle key={`price-${labels[i]}`} cx={xScale(i)} cy={yScale(v)} r={2.5} fill={PRICE_COLOR}>
            <title>
              {labels[i]} — Giá: {v.toFixed(1)}% so với mốc
            </title>
          </circle>
        ))}
        {profit.map((v, i) =>
          v == null ? null : (
            <circle key={`profit-${labels[i]}`} cx={xScale(i)} cy={yScale(v)} r={2.5} fill={PROFIT_COLOR}>
              <title>
                {labels[i]} — Lợi nhuận: {v.toFixed(1)}% so với mốc
              </title>
            </circle>
          )
        )}
      </svg>
    </div>
  );
}
