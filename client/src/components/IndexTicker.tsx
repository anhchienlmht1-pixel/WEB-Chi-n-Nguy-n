import { Link } from "react-router-dom";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatPrice, trendClass } from "../utils/format";
import type { Quote } from "../types";

// The 4 index symbols this data source (KBS) actually has verified quotes
// for (see server/src/providers/indices.ts) — HNX's own top-30 sub-index
// ("HNX30") isn't in that list, only the overall HNXINDEX is, so that's
// what's shown here instead of guessing at an unverified symbol.
const INDEX_SYMBOLS = ["VNINDEX", "VN30", "HNXINDEX", "UPCOMINDEX"] as const;

function IndexCard({ quote }: { quote: Quote }) {
  const dir = quote.changePercent > 0 ? "▲" : quote.changePercent < 0 ? "▼" : "";
  const isUp = quote.changePercent > 0;
  const isDown = quote.changePercent < 0;

  return (
    <Link
      to={`/stock/${quote.symbol}`}
      className={`flex flex-col gap-3 rounded-lg border px-4 py-4 transition-all duration-200 ${
        isUp
          ? "border-green-200 bg-green-50/50 hover:bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 dark:hover:bg-green-950/30"
          : isDown
            ? "border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/60"
      }`}
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
          {quote.symbol}
        </div>
      </div>
      <div className="flex-1">
        <div className={`text-3xl font-bold tabular-nums ${trendClass(quote.changePercent)}`}>
          {formatPrice(quote.price, quote.currency)}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${trendClass(quote.changePercent)}`}>
          {dir}
        </span>
        <div className={`text-xs font-medium tabular-nums text-right ${trendClass(quote.changePercent)}`}>
          <div>{quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)}</div>
          <div>({quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%)</div>
        </div>
      </div>
    </Link>
  );
}

// Compact ticker strip for the 4 main indices — replaces the old "Tâm lý
// thị trường" word-cloud slot with something more directly useful at a
// glance: value + volume + change for VNINDEX/VN30/HNXINDEX/UPCOMINDEX.
export default function IndexTicker() {
  const { data, error, loading } = usePolling(
    () => Promise.all(INDEX_SYMBOLS.map((s) => fetchQuote(s))),
    [],
    30000
  );

  if (loading && !data) {
    return (
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INDEX_SYMBOLS.map((s) => (
          <div key={s} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (error && !data) return null;
  if (!data) return null;

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Chỉ số thị trường</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.map((q) => (
          <IndexCard key={q.symbol} quote={q} />
        ))}
      </div>
    </div>
  );
}
