import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchHistory, fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatChange, formatMarketCap, formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";
import { aggregatePoints, type ChartResolution } from "../utils/aggregate";
import PriceChart, { type IndicatorToggles } from "../components/PriceChart";
import ResolutionSelector from "../components/ResolutionSelector";
import WatchButton from "../components/WatchButton";
import FinancialRatios from "../components/FinancialRatios";

const MA_OPTIONS = [10, 20, 50, 200];
const MA_COLORS: Record<number, string> = { 10: "#f43f5e", 20: "#f59e0b", 50: "#14b8a6", 200: "#7c3aed" };

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const [resolution, setResolution] = useState<ChartResolution>("D");
  const [indicators, setIndicators] = useState<IndicatorToggles>({ maPeriods: [20, 50], rsi: false, macd: false });

  function toggleMa(period: number) {
    setIndicators((prev) => ({
      ...prev,
      maPeriods: prev.maPeriods.includes(period)
        ? prev.maPeriods.filter((p) => p !== period)
        : [...prev.maPeriods, period].sort((a, b) => a - b),
    }));
  }

  function toggleFlag(key: "rsi" | "macd") {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const quoteState = usePolling(() => fetchQuote(symbol), [symbol], 30000);
  // Always fetch the full daily history — the resolution tabs (Ngày/Tuần/
  // Tháng) roll those daily bars up client-side, so switching resolution
  // changes what one candle represents instead of just the visible range.
  const historyState = usePolling(() => fetchHistory(symbol, "5Y"), [symbol]);

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
              {MA_OPTIONS.map((period) => {
                const active = indicators.maPeriods.includes(period);
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => toggleMa(period)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "text-slate-950"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    }`}
                    style={active ? { backgroundColor: MA_COLORS[period] } : undefined}
                  >
                    MA{period}
                  </button>
                );
              })}
              <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
              {(["rsi", "macd"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFlag(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    indicators[key]
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {key === "rsi" ? "RSI 14" : "MACD"}
                </button>
              ))}
            </div>
            <ResolutionSelector value={resolution} onChange={setResolution} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {chartPoints.length > 0 ? (
              <PriceChart points={chartPoints} indicators={indicators} />
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
