import { useState } from "react";
import { useParams } from "react-router-dom";
import { fetchHistory, fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { HistoryRange } from "../types";
import { formatChange, formatMarketCap, formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";
import PriceChart, { type IndicatorToggles } from "../components/PriceChart";
import RangeSelector from "../components/RangeSelector";
import WatchButton from "../components/WatchButton";
import FinancialRatios from "../components/FinancialRatios";

const INDICATOR_LABELS: [keyof IndicatorToggles, string][] = [
  ["sma", "SMA 20/50"],
  ["rsi", "RSI 14"],
  ["macd", "MACD"],
];

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const [range, setRange] = useState<HistoryRange>("3M");
  const [indicators, setIndicators] = useState<IndicatorToggles>({ sma: true, rsi: false, macd: false });

  const quoteState = usePolling(() => fetchQuote(symbol), [symbol], 30000);
  const historyState = usePolling(() => fetchHistory(symbol, range), [symbol, range]);

  const quote = quoteState.data;

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
            <div className="flex flex-wrap gap-1.5">
              {INDICATOR_LABELS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    indicators[key]
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <RangeSelector value={range} onChange={setRange} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {historyState.data && historyState.data.points.length > 0 ? (
              <PriceChart points={historyState.data.points} indicators={indicators} />
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
