"use client";

import useSWR from "swr";
import clsx from "clsx";
import { fetcher } from "@/lib/fetcher";
import { StockQuote } from "@/lib/types";
import { findStock } from "@/lib/symbols";
import { priceState, PRICE_COLOR } from "@/lib/market";
import { formatChange, formatPercent, formatPrice, formatVolume } from "@/lib/format";
import { TradingViewSymbolOverview } from "./TradingViewSymbolOverview";
import { FinancialRatios } from "./FinancialRatios";
import { WatchlistButton } from "./WatchlistButton";

interface Response {
  quotes: StockQuote[];
  failed: string[];
}

export function StockDetail({ symbol }: { symbol: string }) {
  const meta = findStock(symbol);
  const { data, error, isLoading } = useSWR<Response>(`/api/quotes?symbols=${symbol}`, fetcher, {
    refreshInterval: 15000,
  });

  const quote = data?.quotes.find((q) => q.symbol === symbol);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
        <div className="glow-radial pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{symbol}</h1>
              {meta && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  {meta.exchange}
                </span>
              )}
              <WatchlistButton symbol={symbol} />
            </div>
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {meta ? `${meta.name} · ${meta.industry}` : "Không có thông tin công ty"}
            </p>
          </div>

          {isLoading && <div className="h-12 w-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />}
          {!isLoading && (error || data?.failed.includes(symbol)) && (
            <div className="text-sm text-red-600 dark:text-red-400">Không thể tải giá cho {symbol}.</div>
          )}
          {quote && (
            <StockPriceHeader quote={quote} />
          )}
        </div>

        {quote && (
          <div className="relative mt-5 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-5 text-sm dark:border-neutral-800 sm:grid-cols-4">
            <Stat label="Mở cửa" value={formatPrice(quote.open)} />
            <Stat label="Cao nhất" value={formatPrice(quote.high)} />
            <Stat label="Thấp nhất" value={formatPrice(quote.low)} />
            <Stat label="Khối lượng" value={formatVolume(quote.volume)} />
            <Stat
              label="Tham chiếu"
              value={formatPrice(quote.refPrice)}
              valueClass="text-amber-600 dark:text-amber-300"
            />
            <Stat
              label="Trần"
              value={formatPrice(quote.ceilingPrice)}
              valueClass="text-fuchsia-600 dark:text-fuchsia-400"
            />
            <Stat label="Sàn" value={formatPrice(quote.floorPrice)} valueClass="text-sky-600 dark:text-sky-400" />
          </div>
        )}
      </div>

      <TradingViewSymbolOverview tvSymbol={`${meta?.exchange ?? "HOSE"}:${symbol}`} />
      <FinancialRatios symbol={symbol} />
    </div>
  );
}

function StockPriceHeader({ quote }: { quote: StockQuote }) {
  const state = priceState(quote.price, quote.refPrice, quote.ceilingPrice, quote.floorPrice);
  return (
    <div className="text-right">
      <div className={clsx("text-3xl font-bold tabular-nums", PRICE_COLOR[state])}>
        {formatPrice(quote.price)}
      </div>
      <div className={clsx("text-sm font-medium tabular-nums", PRICE_COLOR[state])}>
        {formatChange(quote.change)} ({formatPercent(quote.changePercent)})
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-xs text-neutral-400 dark:text-neutral-500">{label}</div>
      <div className={clsx("font-semibold tabular-nums", valueClass ?? "text-neutral-900 dark:text-neutral-100")}>
        {value}
      </div>
    </div>
  );
}
