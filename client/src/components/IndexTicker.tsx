import { Link } from "react-router-dom";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatPrice, formatVolume, trendClass } from "../utils/format";
import type { Quote } from "../types";

// The 4 index symbols this data source (KBS) actually has verified quotes
// for (see server/src/providers/indices.ts) — HNX's own top-30 sub-index
// ("HNX30") isn't in that list, only the overall HNXINDEX is, so that's
// what's shown here instead of guessing at an unverified symbol.
const INDEX_SYMBOLS = ["VNINDEX", "VN30", "HNXINDEX", "UPCOMINDEX"] as const;

function IndexCard({ quote }: { quote: Quote }) {
  const dir = quote.changePercent > 0 ? "▲" : quote.changePercent < 0 ? "▼" : "";
  return (
    <Link
      to={`/stock/${quote.symbol}`}
      className="flex flex-1 flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 min-w-[140px]"
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {quote.symbol}
        </div>
      </div>
      <div className="text-right">
        <div className={`text-2xl font-bold tabular-nums ${trendClass(quote.changePercent)}`}>
          {formatPrice(quote.price, quote.currency)}
        </div>
        <div className={`text-xs font-medium tabular-nums ${trendClass(quote.changePercent)}`}>
          {dir} {quote.change >= 0 ? "+" : ""}
          {quote.change.toFixed(2)} ({quote.changePercent >= 0 ? "+" : ""}
          {quote.changePercent.toFixed(2)}%)
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
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INDEX_SYMBOLS.map((s) => (
          <div key={s} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (error && !data) return null;
  if (!data) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {data.map((q) => (
        <IndexCard key={q.symbol} quote={q} />
      ))}
    </div>
  );
}
