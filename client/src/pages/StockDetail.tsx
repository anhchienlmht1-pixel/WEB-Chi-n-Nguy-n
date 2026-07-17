import { useParams } from "react-router-dom";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatChange, formatMarketCap, formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import WatchButton from "../components/WatchButton";
import FinancialRatios from "../components/FinancialRatios";
import SeasonalityHeatmap from "../components/SeasonalityHeatmap";
import NewsFeed from "../components/NewsFeed";
import ProfitVsPriceChart from "../components/ProfitVsPriceChart";
import ValuationChart from "../components/ValuationChart";

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const quoteState = usePolling(() => fetchQuote(symbol), [symbol], 30000);
  const quote = quoteState.data;
  const isIndexOrFutures = quote?.exchange === "Chỉ số" || quote?.exchange === "Phái sinh";

  if (quoteState.error && !quote) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-10 text-center">
        <p className="text-red-500 dark:text-red-400">
          Không tải được mã "{symbol}": {quoteState.error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
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

          <div className="mb-4">
            <TechnicalChartPanel symbol={symbol} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Mở cửa" value={formatPrice(quote.open, quote.currency)} />
            <Stat label="Cao nhất" value={formatPrice(quote.high, quote.currency)} />
            <Stat label="Thấp nhất" value={formatPrice(quote.low, quote.currency)} />
            <Stat label="Đóng cửa trước" value={formatPrice(quote.prevClose, quote.currency)} />
            <Stat label="Khối lượng" value={formatVolume(quote.volume)} />
            {!isIndexOrFutures && <Stat label="Vốn hóa" value={formatMarketCap(quote.marketCap, quote.currency)} />}
          </div>

          <p className="mt-6 text-xs text-slate-400 dark:text-slate-600">
            Cập nhật lúc {new Date(quote.updatedAt).toLocaleTimeString("vi-VN")}
          </p>

          {!isIndexOrFutures && (
            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ProfitVsPriceChart symbol={quote.symbol} />
              <ValuationChart symbol={quote.symbol} />
            </div>
          )}

          <div className="mt-6">
            <SeasonalityHeatmap symbol={quote.symbol} />
          </div>

          <div className="mt-6">
            <NewsFeed symbol={quote.symbol} />
          </div>

          {/* Indices/futures aren't companies — no financial statements to show. */}
          {!isIndexOrFutures && (
            <div className="mt-6">
              <FinancialRatios symbol={quote.symbol} />
            </div>
          )}
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
