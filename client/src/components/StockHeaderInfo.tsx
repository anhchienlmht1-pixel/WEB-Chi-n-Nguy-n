import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import CompanyLogo from "./CompanyLogo";

// The chip only makes sense on a stock page, so the market board (the whole
// universe, ~200 quotes) is only fetched and polled when there is a symbol.
// It used to download the entire board every 5s on every page. Note the Header
// is mounted outside <Routes>, so useParams() has no :symbol here today and the
// chip stays hidden (as it always has) — now without the background polling.
export default function StockHeaderInfo() {
  const { symbol } = useParams<{ symbol: string }>();
  return symbol ? <StockChip symbol={symbol} /> : null;
}

function StockChip({ symbol }: { symbol: string }) {
  // Fetch market data to get current stock info. The server refreshes the
  // board every 30s, so polling faster than this only repeats the same data.
  const { data } = usePolling(fetchMarketOverview, [], 15000);

  // Find the current stock in market overview
  const stockInfo = useMemo(() => {
    if (!data) return null;
    return data.quotes.find((q) => q.symbol === symbol);
  }, [symbol, data]);

  // Don't show if not on a stock page or no data
  if (!stockInfo) {
    return null;
  }

  const change = stockInfo.change ?? 0;
  const changePercent = stockInfo.changePercent ?? 0;
  const isPositive = change >= 0;

  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/30">
      <CompanyLogo symbol={stockInfo.symbol} size={32} fallback="none" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {stockInfo.symbol}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {stockInfo.name}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {stockInfo.price?.toFixed(2) ?? "-"}
        </div>
        <div className={`text-xs font-medium ${
          isPositive
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}>
          {isPositive ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
        </div>
      </div>
    </div>
  );
}
