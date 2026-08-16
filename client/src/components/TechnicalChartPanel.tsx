import { useMemo, useRef, useState } from "react";
import { fetchHistory } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { aggregatePoints, type ChartResolution } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";
import PriceChart, { type ActiveIndicator, type ChartType, type DrawingTool, type PriceChartHandle } from "./PriceChart";
import ChartToolbar from "./ChartToolbar";
import DrawingToolbar from "./DrawingToolbar";
import TrendSystemStats from "./TrendSystemStats";

// No indicator overlays by default anymore (used to be SMA20/SMA50) — kept
// minimal per request: just candles + the Mua/Bán trend-following markers,
// which are on by default now instead of an opt-in toggle.
const NO_INDICATORS: ActiveIndicator[] = [];

// Full technical-chart experience (toolbar, drawing tools) as a standalone
// panel driven only by a symbol — used on the stock detail page and, at a
// larger height, on the homepage.
export default function TechnicalChartPanel({
  symbol,
  height = 420,
  preferSource,
  onSymbolChange,
}: {
  symbol: string;
  height?: number;
  /** Pin history to the same provider a sibling quote already resolved to
   * (see api/client.ts fetchHistory) — avoids the chart silently landing on
   * a different source than the price header shown next to it. */
  preferSource?: string;
  /** Shows a symbol search box right in the chart's own toolbar when set —
   * only meaningful where the symbol is local component state (the market
   * page's standalone chart), not where it comes from the URL (stock
   * detail's own chart, driven by react-router's :symbol param). */
  onSymbolChange?: (symbol: string) => void;
}) {
  const [resolution, setResolution] = useState<ChartResolution>("D");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [drawingTool, setDrawingTool] = useState<DrawingTool>(null);
  const [showSignals, setShowSignals] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTimeoutId, setSearchTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const chartRef = useRef<PriceChartHandle>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  function screenshot() {
    const dataUrl = chartRef.current?.takeScreenshot();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${symbol}-chart.png`;
    a.click();
  }

  function toggleFullscreen() {
    const el = chartWrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }

  function handleChartKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Only capture if onSymbolChange is available
    if (!onSymbolChange) return;

    // Clear existing timeout
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId);
    }

    // Capture alphanumeric input (stock codes are typically uppercase letters and numbers)
    if (/^[A-Z0-9]$/i.test(e.key)) {
      e.preventDefault();
      const newInput = searchInput + e.key.toUpperCase();
      setSearchInput(newInput);

      // Auto-search after typing
      const timeoutId = setTimeout(() => {
        if (newInput && newInput !== symbol) {
          onSymbolChange(newInput);
        }
        setSearchInput("");
      }, 500);

      setSearchTimeoutId(timeoutId);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const newInput = searchInput.slice(0, -1);
      setSearchInput(newInput);

      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId);
      }

      if (newInput) {
        const timeoutId = setTimeout(() => {
          if (newInput && newInput !== symbol) {
            onSymbolChange(newInput);
          }
          setSearchInput("");
        }, 500);
        setSearchTimeoutId(timeoutId);
      }
    } else if (e.key === "Escape") {
      setSearchInput("");
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId);
      }
    }
  }

  // Always fetch the full daily history — the resolution tabs (Ngày/Tuần/
  // Tháng) roll those daily bars up client-side, so switching resolution
  // changes what one candle represents instead of just the visible range.
  const historyState = usePolling(() => fetchHistory(symbol, "MAX", preferSource), [symbol, preferSource]);
  const chartPoints = useMemo(
    () => (historyState.data ? aggregatePoints(historyState.data.points, resolution) : []),
    [historyState.data, resolution]
  );
  const signalResult = useMemo(
    () => {
      // Don't show signals for VNINDEX
      if (symbol === "VNINDEX" || !showSignals) {
        return { all: [], transitions: [] };
      }
      return computeTradingSignals(chartPoints);
    },
    [chartPoints, showSignals, symbol]
  );

  return (
    <div
      ref={chartWrapperRef}
      onKeyDown={handleChartKeyDown}
      tabIndex={0}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 focus:outline-none relative"
    >
      {searchInput && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg font-bold text-lg">
          Tìm kiếm: <span className="font-black text-xl">{searchInput}</span>
        </div>
      )}
      <ChartToolbar
        symbol={`${symbol} (${resolution})`}
        plainSymbol={symbol}
        onSymbolChange={onSymbolChange}
        resolution={resolution}
        onResolutionChange={setResolution}
        chartType={chartType}
        onChartTypeChange={setChartType}
        showSignals={showSignals && symbol !== "VNINDEX"}
        onToggleSignals={() => setShowSignals((v) => !v)}
        onScreenshot={screenshot}
        onFullscreen={toggleFullscreen}
      />

      <div className="flex flex-col">
        <div className="flex flex-1">
          <DrawingToolbar tool={drawingTool} onSelect={setDrawingTool} onClear={() => chartRef.current?.clearDrawings()} />
          <div className="min-w-0 flex-1 p-2">
            {chartPoints.length > 0 ? (
              <PriceChart
                ref={chartRef}
                points={chartPoints}
                activeIndicators={NO_INDICATORS}
                signals={signalResult.transitions}
                chartType={chartType}
                drawingTool={drawingTool}
                onDrawingComplete={() => setDrawingTool(null)}
                height={height}
              />
            ) : (
              <div className="flex items-center justify-center text-slate-400 dark:text-slate-500" style={{ height }}>
                {historyState.loading
                  ? "Đang tải biểu đồ..."
                  : historyState.error
                    ? `Lỗi tải biểu đồ: ${historyState.error}`
                    : "Không có dữ liệu biểu đồ"}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-slate-200 px-2 pb-2 dark:border-slate-800">
          <TrendSystemStats signals={signalResult.all} symbol={symbol} />
        </div>
      </div>
    </div>
  );
}
