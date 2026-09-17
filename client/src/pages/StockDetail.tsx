import { useParams } from "react-router-dom";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatChange, formatMarketCap, formatPercent, formatPrice, formatVolume, trendClass } from "../utils/format";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import WatchButton from "../components/WatchButton";
import SeasonalityHeatmap from "../components/SeasonalityHeatmap";
import NewsFeed from "../components/NewsFeed";
import BankFundamentals from "../components/BankFundamentals";
import { isBankSymbol } from "../utils/bankData";
import SecuritiesFundamentals from "../components/SecuritiesFundamentals";
import SecuritiesDetailView from "../components/SecuritiesDetailView";
import { isSecuritiesSymbol } from "../utils/securitiesData";
import CompanyProfileCard from "../components/CompanyProfileCard";
import ForeignFlowPanel from "../components/ForeignFlowPanel";
import StockOutlookPanel from "../components/StockOutlookPanel";

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const quoteState = usePolling(() => fetchQuote(symbol), [symbol], 30000);
  const quote = quoteState.data;
  const isIndexOrFutures = quote?.exchange === "Chỉ số" || quote?.exchange === "Phái sinh";

  if (quoteState.error && !quote) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-10 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Không tải được mã "{symbol}": {quoteState.error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {quote && (
        <>
          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {quote.symbol}
                  </h1>
                  {quote.exchange && (
                    <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                      {quote.exchange}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{quote.name}</p>
                <div className="mt-3">
                  <WatchButton symbol={quote.symbol} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatPrice(quote.price, quote.currency)}
                </div>
                <div className={`mt-1 text-sm font-semibold tabular-nums ${trendClass(quote.change)}`}>
                  {formatChange(quote.change, quote.currency)} ({formatPercent(quote.changePercent)})
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{quote.currency}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]">
            <div>
              <TechnicalChartPanel symbol={symbol} preferSource={quote.source} exchange={quote.exchange} height={440} />

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Mở cửa" value={formatPrice(quote.open, quote.currency)} />
                <Stat label="Cao nhất" value={formatPrice(quote.high, quote.currency)} />
                <Stat label="Thấp nhất" value={formatPrice(quote.low, quote.currency)} />
                <Stat label="Đóng cửa trước" value={formatPrice(quote.prevClose, quote.currency)} />
                <Stat label="Khối lượng" value={formatVolume(quote.volume)} />
                {!isIndexOrFutures && <Stat label="Vốn hóa" value={formatMarketCap(quote.marketCap, quote.currency)} />}
              </div>

              <p className="mt-4 text-xs text-slate-400 dark:text-slate-600">
                Cập nhật lúc {new Date(quote.updatedAt).toLocaleTimeString("vi-VN")}
              </p>
            </div>

            <div className="space-y-4">
              {!isIndexOrFutures && <CompanyProfileCard symbol={quote.symbol} fallbackName={quote.name} />}
              {!isIndexOrFutures && <StockOutlookPanel symbol={quote.symbol} />}
              {!isIndexOrFutures && <ForeignFlowPanel quote={quote} />}
            </div>
          </div>

          {isBankSymbol(quote.symbol) && (
            <div className="mt-6">
              <BankFundamentals symbol={quote.symbol} />
            </div>
          )}

          {isSecuritiesSymbol(quote.symbol) && (
            <div className="mt-6">
              <SecuritiesFundamentals symbol={quote.symbol} />
            </div>
          )}

          {isSecuritiesSymbol(quote.symbol) && (
            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
              <SecuritiesDetailView symbol={quote.symbol} />
            </div>
          )}

          <div className="mt-6">
            <SeasonalityHeatmap symbol={quote.symbol} />
          </div>

          <div className="mt-6">
            <NewsFeed symbol={quote.symbol} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/50">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</div>
      <div className="mt-1.5 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
