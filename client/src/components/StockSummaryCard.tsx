import { useNavigate } from "react-router-dom";
import type { HistoryPoint, Quote } from "../types";
import { formatChange, formatFinancialValue, formatMarketCap, formatPercent, formatPrice, trendClass } from "../utils/format";
import { latestSignal } from "../utils/signals";
import type { KeyRatios } from "../utils/ratios";
import WatchButton from "./WatchButton";

function Sparkline({ points, positive }: { points: HistoryPoint[]; positive: boolean }) {
  const width = 100;
  const height = 32;
  if (points.length < 2) return <div style={{ height }} />;

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const coords = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * width;
    const y = height - ((c - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatRatio(r: { value: number; unit: string }): string {
  const formatted = formatFinancialValue(r.value, r.unit);
  return r.unit === "%" ? `${formatted}%` : r.unit ? `${formatted} ${r.unit}` : formatted;
}

function SignalBadge({ signal }: { signal: "buy" | "sell" | null }) {
  if (!signal) return null;
  const isBuy = signal === "buy";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isBuy
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
      }`}
    >
      {isBuy ? "MUA" : "BÁN"}
    </span>
  );
}

export default function StockSummaryCard({
  quote,
  points,
  ratios,
}: {
  quote: Quote;
  points: HistoryPoint[];
  ratios?: KeyRatios;
}) {
  const navigate = useNavigate();
  const positive = quote.change >= 0;
  const signal = latestSignal(points);
  const isIndexOrFutures = quote.exchange === "Chỉ số" || quote.exchange === "Phái sinh";

  return (
    <div
      onClick={() => navigate(`/stock/${quote.symbol}`)}
      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-emerald-600"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-slate-100">{quote.symbol}</span>
            <SignalBadge signal={signal} />
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{quote.name}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <WatchButton symbol={quote.symbol} />
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {formatPrice(quote.price, quote.currency)}
        </span>
        <span className={`text-xs font-medium tabular-nums ${trendClass(quote.change)}`}>
          {formatChange(quote.change, quote.currency)} ({formatPercent(quote.changePercent)})
        </span>
      </div>

      <div className="mt-2">
        <Sparkline points={points} positive={positive} />
      </div>

      {!isIndexOrFutures && (ratios?.pe || ratios?.roe || ratios?.roa || quote.marketCap) && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
          {ratios?.pe && <span>P/E {formatRatio(ratios.pe)}</span>}
          {ratios?.roe && <span>ROE {formatRatio(ratios.roe)}</span>}
          {ratios?.roa && <span>ROA {formatRatio(ratios.roa)}</span>}
          <span className="ml-auto">{formatMarketCap(quote.marketCap, quote.currency)}</span>
        </div>
      )}
    </div>
  );
}
