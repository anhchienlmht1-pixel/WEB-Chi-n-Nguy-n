import { useEffect, useState } from "react";
import { fetchQuote } from "../api/client";
import { isKnownIndex, toTradingViewSymbol } from "../utils/tradingViewSymbol";
import SymbolPicker from "./SymbolPicker";
import TechnicalChartPanel from "./TechnicalChartPanel";
import TradingViewChart from "./TradingViewChart";

type View = "tv" | "signal";

const TABS: { key: View; label: string }[] = [
  { key: "tv", label: "TradingView" },
  { key: "signal", label: "Tín hiệu Mua/Bán" },
];

// The chart area on the homepage and the stock page: TradingView by default
// (Vietnamese listings only), with the site's own chart — the one that draws
// the Mua/Bán markers and the Trend Following stats — one click away on the
// "Tín hiệu Mua/Bán" tab. The own chart component is unchanged; the markers
// can't be drawn on the embedded TradingView widget, which is why it stays.
export default function ChartSwitcher({
  symbol,
  height = 420,
  preferSource,
  onSymbolChange,
}: {
  symbol: string;
  height?: number;
  preferSource?: string;
  /** Set where the symbol is local state (homepage); shows a search box. */
  onSymbolChange?: (symbol: string) => void;
}) {
  const [view, setView] = useState<View>("tv");
  const [looked, setLooked] = useState<{ symbol: string; exchange: string | null } | null>(null);

  // Indices are mapped by name; a stock's exchange (HOSE/HNX/UPCOM) comes from
  // its quote — the same request the page itself makes, deduped in api/client.
  const needsLookup = !isKnownIndex(symbol);
  useEffect(() => {
    if (!needsLookup) return;
    let cancelled = false;
    fetchQuote(symbol)
      .then((q) => !cancelled && setLooked({ symbol, exchange: q.exchange }))
      .catch(() => !cancelled && setLooked({ symbol, exchange: null }));
    return () => {
      cancelled = true;
    };
  }, [symbol, needsLookup]);

  const resolvedExchange = looked?.symbol === symbol ? looked.exchange : undefined;
  const pending = needsLookup && looked?.symbol !== symbol;
  const tvSymbol = pending ? null : toTradingViewSymbol(symbol, resolvedExchange);
  // No TradingView listing (UPCOM index, unknown exchange…) → own chart only.
  const active: View = !pending && !tvSymbol ? "signal" : view;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Loại biểu đồ"
          className="flex gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/40"
        >
          {TABS.map((tab) => {
            const disabled = tab.key === "tv" && !pending && !tvSymbol;
            const selected = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={disabled}
                title={disabled ? "TradingView không có mã này" : undefined}
                onClick={() => setView(tab.key)}
                className={`shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {/* In the "Tín hiệu" tab the own chart's toolbar already has this box. */}
        {active === "tv" && onSymbolChange && (
          <div className="min-w-[160px] flex-1">
            <SymbolPicker value={symbol} onChange={onSymbolChange} />
          </div>
        )}
      </div>

      {active === "tv" ? (
        tvSymbol ? (
          <TradingViewChart tvSymbol={tvSymbol} height={height + 60} />
        ) : (
          <div
            aria-hidden
            className="animate-pulse rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
            style={{ height: height + 60 }}
          />
        )
      ) : (
        <TechnicalChartPanel
          symbol={symbol}
          height={height}
          onSymbolChange={onSymbolChange}
          preferSource={preferSource}
        />
      )}
    </div>
  );
}
