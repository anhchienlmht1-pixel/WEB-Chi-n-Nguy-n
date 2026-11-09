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
  hideStats,
}: {
  symbol: string;
  height?: number;
  preferSource?: string;
  /** Set where the symbol is local state (homepage); shows a search box. */
  onSymbolChange?: (symbol: string) => void;
  /** Passed through to the own chart: skip its stats block (homepage shows a card). */
  hideStats?: boolean;
}) {
  const [view, setView] = useState<View>("tv");
  const [looked, setLooked] = useState<{ symbol: string; exchange: string | null } | null>(null);
  // TradingView symbols the widget turned out not to carry (it fell back to a
  // foreign stock): those are shown on the own chart instead.
  const [blocked, setBlocked] = useState<string[]>([]);

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
  const mapped = pending ? null : toTradingViewSymbol(symbol, resolvedExchange);
  const tvSymbol = mapped && !blocked.includes(mapped) ? mapped : null;
  // No TradingView listing (UPCOM index, unknown exchange, widget fell back…) → own chart only.
  const active: View = !pending && !tvSymbol ? "signal" : view;
  const hiddenByGuard = !pending && !!mapped && !tvSymbol;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Loại biểu đồ"
          className="flex gap-1 rounded-md bg-emerald-50 p-1"
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
                className={`min-h-9 shrink-0 rounded px-4 text-base font-bold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-emerald-700"
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
            <SymbolPicker large value={symbol} onChange={onSymbolChange} />
          </div>
        )}
      </div>

      {hiddenByGuard && (
        <p role="status" className="mb-2 text-base text-slate-600">
          TradingView chưa hiển thị được mã {symbol}, đang dùng biểu đồ tín hiệu của hệ thống.
        </p>
      )}

      {active === "tv" ? (
        tvSymbol ? (
          <TradingViewChart
            key={tvSymbol}
            tvSymbol={tvSymbol}
            height={height + 60}
            onUnavailable={(s) => setBlocked((b) => (b.includes(s) ? b : [...b, s]))}
          />
        ) : (
          <div
            aria-hidden
            className="animate-pulse rounded-md border border-slate-200 bg-slate-50"
            style={{ height: height + 60 }}
          />
        )
      ) : (
        <TechnicalChartPanel
          symbol={symbol}
          height={height}
          onSymbolChange={onSymbolChange}
          preferSource={preferSource}
          hideStats={hideStats}
        />
      )}
    </div>
  );
}
