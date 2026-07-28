import { useMemo, useRef, useState } from "react";
import { fetchHistory } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { aggregatePoints, type ChartResolution } from "../utils/aggregate";
import { findIndicatorDef, defaultParams } from "../utils/indicatorCatalog";
import { computeTradingSignals } from "../utils/signals";
import PriceChart, { type ActiveIndicator, type ChartType, type DrawingTool, type PriceChartHandle } from "./PriceChart";
import ChartToolbar from "./ChartToolbar";
import DrawingToolbar from "./DrawingToolbar";
import IndicatorPicker from "./IndicatorPicker";
import IndicatorSettings from "./IndicatorSettings";

let nextInstanceId = 1;
function makeInstance(defId: string): ActiveIndicator {
  const def = findIndicatorDef(defId);
  return { instanceId: `${defId}-${nextInstanceId++}`, defId, params: def ? defaultParams(def) : {} };
}

const DEFAULT_INDICATORS: ActiveIndicator[] = [
  { instanceId: "sma-default-20", defId: "sma", params: { period: 20 } },
  { instanceId: "sma-default-50", defId: "sma", params: { period: 50 } },
];

// Full technical-chart experience (toolbar, drawing tools, indicator
// library) as a standalone panel driven only by a symbol — used on the
// stock detail page and, at a larger height, on the homepage.
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
  const [indicators, setIndicators] = useState<ActiveIndicator[]>(DEFAULT_INDICATORS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [drawingTool, setDrawingTool] = useState<DrawingTool>(null);
  const [showSignals, setShowSignals] = useState(false);
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

  function addIndicator(defId: string) {
    setIndicators((prev) => [...prev, makeInstance(defId)]);
  }

  function removeIndicator(instanceId: string) {
    setIndicators((prev) => prev.filter((i) => i.instanceId !== instanceId));
  }

  function updateIndicatorParams(instanceId: string, params: Record<string, number>) {
    setIndicators((prev) => prev.map((i) => (i.instanceId === instanceId ? { ...i, params } : i)));
  }

  const activeDefIds = useMemo(() => new Set(indicators.map((i) => i.defId)), [indicators]);
  const editingIndicator = indicators.find((i) => i.instanceId === editingInstanceId);
  const editingDef = editingIndicator ? findIndicatorDef(editingIndicator.defId) : undefined;

  // Always fetch the full daily history — the resolution tabs (Ngày/Tuần/
  // Tháng) roll those daily bars up client-side, so switching resolution
  // changes what one candle represents instead of just the visible range.
  const historyState = usePolling(() => fetchHistory(symbol, "MAX", preferSource), [symbol, preferSource]);
  const chartPoints = useMemo(
    () => (historyState.data ? aggregatePoints(historyState.data.points, resolution) : []),
    [historyState.data, resolution]
  );
  const signalResult = useMemo(
    () => (showSignals ? computeTradingSignals(chartPoints) : { all: [], transitions: [] }),
    [chartPoints, showSignals]
  );
  const buyCount = useMemo(() => signalResult.all.filter((s) => s.type === "buy").length, [signalResult]);
  const sellCount = useMemo(() => signalResult.all.filter((s) => s.type === "sell").length, [signalResult]);

  return (
    <>
      {pickerOpen && (
        <IndicatorPicker activeIds={activeDefIds} onAdd={(defId) => addIndicator(defId)} onClose={() => setPickerOpen(false)} />
      )}

      {editingIndicator && editingDef && (
        <IndicatorSettings
          def={editingDef}
          initialParams={editingIndicator.params}
          onApply={(params) => updateIndicatorParams(editingIndicator.instanceId, params)}
          onClose={() => setEditingInstanceId(null)}
        />
      )}

      <div
        ref={chartWrapperRef}
        className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40"
      >
        <ChartToolbar
          symbol={`${symbol} (${resolution})`}
          plainSymbol={symbol}
          onSymbolChange={onSymbolChange}
          resolution={resolution}
          onResolutionChange={setResolution}
          chartType={chartType}
          onChartTypeChange={setChartType}
          onOpenIndicators={() => setPickerOpen(true)}
          showSignals={showSignals}
          onToggleSignals={() => setShowSignals((v) => !v)}
          onScreenshot={screenshot}
          onFullscreen={toggleFullscreen}
        />

        {showSignals && signalResult.all.length > 0 && (
          <div className="flex items-center gap-3 border-b border-slate-200 px-2 py-1.5 text-xs font-medium dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400">▲ Mua: {buyCount}</span>
            <span className="text-red-500 dark:text-red-400">▼ Bán: {sellCount}</span>
            <span className="text-slate-400 dark:text-slate-500">
              (SMA20/SMA50, ADX(14) &gt; 25, Supertrend(10,3))
            </span>
          </div>
        )}

        {indicators.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-2 py-1.5 dark:border-slate-800">
            {indicators.map((ind) => {
              const def = findIndicatorDef(ind.defId);
              if (!def) return null;
              return (
                <span
                  key={ind.instanceId}
                  className="flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {def.nameEn}
                  {Object.values(ind.params).length > 0 && (
                    <span className="text-slate-400 dark:text-slate-500">({Object.values(ind.params).join(",")})</span>
                  )}
                  {def.params.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditingInstanceId(ind.instanceId)}
                      aria-label={`Cài đặt ${def.nameEn}`}
                      className="rounded-full px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    >
                      ⚙
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeIndicator(ind.instanceId)}
                    aria-label={`Bỏ ${def.nameEn}`}
                    className="rounded-full px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex">
          <DrawingToolbar tool={drawingTool} onSelect={setDrawingTool} onClear={() => chartRef.current?.clearDrawings()} />
          <div className="min-w-0 flex-1 p-2">
            {chartPoints.length > 0 ? (
              <PriceChart
                ref={chartRef}
                points={chartPoints}
                activeIndicators={indicators}
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
      </div>
    </>
  );
}
