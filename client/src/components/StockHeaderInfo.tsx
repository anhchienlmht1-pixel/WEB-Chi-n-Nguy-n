import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";

export default function StockHeaderInfo() {
  const { symbol } = useParams<{ symbol: string }>();

  // Fetch market data to get current stock info
  const { data } = usePolling(fetchMarketOverview, [], 5000);

  // Find the current stock in market overview
  const stockInfo = useMemo(() => {
    if (!symbol || !data) return null;
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
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/30">
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
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        }`}>
          {isPositive ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
        </div>
      </div>
    </div>
  );
}
