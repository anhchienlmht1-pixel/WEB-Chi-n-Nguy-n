import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchHistory, fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatChange, formatMarketCap, formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";
import { aggregatePoints, type ChartResolution } from "../utils/aggregate";
import { findIndicatorDef, defaultParams } from "../utils/indicatorCatalog";
import PriceChart, { type ActiveIndicator } from "../components/PriceChart";
import ResolutionSelector from "../components/ResolutionSelector";
import IndicatorPicker from "../components/IndicatorPicker";
import WatchButton from "../components/WatchButton";
import FinancialRatios from "../components/FinancialRatios";

let nextInstanceId = 1;
function makeInstance(defId: string): ActiveIndicator {
  const def = findIndicatorDef(defId);
  return { instanceId: `${defId}-${nextInstanceId++}`, defId, params: def ? defaultParams(def) : {} };
}

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const [resolution, setResolution] = useState<ChartResolution>("D");
  const [indicators, setIndicators] = useState<ActiveIndicator[]>(() => [
    { instanceId: "sma-default-20", defId: "sma", params: { period: 20 } },
    { instanceId: "sma-default-50", defId: "sma", params: { period: 50 } },
  ]);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addIndicator(defId: string) {
    setIndicators((prev) => [...prev, makeInstance(defId)]);
  }

  function removeIndicator(instanceId: string) {
    setIndicators((prev) => prev.filter((i) => i.instanceId !== instanceId));
  }

  const activeDefIds = useMemo(() => new Set(indicators.map((i) => i.defId)), [indicators]);

  const quoteState = usePolling(() => fetchQuote(symbol), [symbol], 30000);
  // Always fetch the full daily history — the resolution tabs (Ngày/Tuần/
  // Tháng) roll those daily bars up client-side, so switching resolution
  // changes what one candle represents instead of just the visible range.
  const historyState = usePolling(() => fetchHistory(symbol, "MAX"), [symbol]);

  const quote = quoteState.data;
  const chartPoints = useMemo(
    () => (historyState.data ? aggregatePoints(historyState.data.points, resolution) : []),
    [historyState.data, resolution]
  );

  if (quoteState.error && !quote) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-center">
        <p className="text-red-500 dark:text-red-400">
          Không tải được mã "{symbol}": {quoteState.error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {quote && (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {quote.symbol}
                </h1>
                {quote.exchange && (
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {quote.exchange}
                  </span>
                )}
                <WatchButton symbol={quote.symbol} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">{quote.name}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatPrice(quote.price, quote.currency)}
                <span className="ml-2 text-base text-slate-500">{quote.currency}</span>
              </div>
              <div className={`text-sm font-medium tabular-nums ${trendClass(quote.change)}`}>
                {formatChange(quote.change, quote.currency)} ({formatPercent(quote.changePercent)})
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
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
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
              >
                + Chỉ báo
              </button>
            </div>
            <ResolutionSelector value={resolution} onChange={setResolution} />
          </div>

          {pickerOpen && (
            <IndicatorPicker
              activeIds={activeDefIds}
              onAdd={(defId) => addIndicator(defId)}
              onClose={() => setPickerOpen(false)}
            />
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {chartPoints.length > 0 ? (
              <PriceChart points={chartPoints} activeIndicators={indicators} />
            ) : (
              <div className="flex h-[400px] items-center justify-center text-slate-400 dark:text-slate-500">
                {historyState.loading
                  ? "Đang tải biểu đồ..."
                  : historyState.error
                    ? `Lỗi tải biểu đồ: ${historyState.error}`
                    : "Không có dữ liệu biểu đồ"}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Mở cửa" value={formatPrice(quote.open, quote.currency)} />
            <Stat label="Cao nhất" value={formatPrice(quote.high, quote.currency)} />
            <Stat label="Thấp nhất" value={formatPrice(quote.low, quote.currency)} />
            <Stat label="Đóng cửa trước" value={formatPrice(quote.prevClose, quote.currency)} />
            <Stat label="Khối lượng" value={formatVolume(quote.volume)} />
            <Stat label="Vốn hóa" value={formatMarketCap(quote.marketCap, quote.currency)} />
          </div>

          <p className="mt-6 text-xs text-slate-400 dark:text-slate-600">
            Cập nhật lúc {new Date(quote.updatedAt).toLocaleTimeString("vi-VN")}
          </p>

          <div className="mt-6">
            <FinancialRatios symbol={quote.symbol} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
