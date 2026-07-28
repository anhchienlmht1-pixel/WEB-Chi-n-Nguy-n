"use client";

import clsx from "clsx";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { findStock } from "@/lib/symbols";
import { priceState, PRICE_COLOR } from "@/lib/market";
import {
  formatChange,
  formatCompactVnd,
  formatDateTime,
  formatFinancialValue,
  formatPercent,
  formatPrice,
  formatVolume,
} from "@/lib/format";
import type { StockQuote } from "@/lib/types";
import type { CompanyMetrics, RatioValue } from "@/lib/companyMetrics";
import type { RsRankResult } from "@/lib/rsRank";
import { WatchlistButton } from "./WatchlistButton";
import { CompanyLogo } from "./CompanyLogo";

interface QuotesResponse {
  quotes: StockQuote[];
  failed: string[];
}

function formatRatioDisplay(rv: RatioValue | undefined): string {
  if (!rv || rv.value === null) return "--";
  const formatted = formatFinancialValue(rv.value, rv.unit);
  const unit = rv.unit.trim();
  if (unit === "%") return `${formatted}%`;
  if (/lần/i.test(unit)) return `${formatted} lần`;
  if (unit) return `${formatted} ${unit}`;
  return formatted;
}

function signColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "text-neutral-400 dark:text-neutral-500";
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-neutral-500 dark:text-neutral-400";
}

function scrollToFinancials() {
  document.getElementById("financial-ratios")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CompanyProfileCard({ symbol }: { symbol: string }) {
  const meta = findStock(symbol);

  const { data: quotesData, error: quoteError, isLoading: quoteLoading } = useSWR<QuotesResponse>(
    `/api/quotes?symbols=${symbol}`,
    fetcher,
    { refreshInterval: 15000 }
  );
  const { data: metrics } = useSWR<CompanyMetrics>(`/api/company-metrics?symbol=${symbol}`, fetcher);
  const { data: rs } = useSWR<RsRankResult | null>(`/api/rs-rank?symbol=${symbol}`, fetcher);

  const quote = quotesData?.quotes.find((q) => q.symbol === symbol);
  const state = quote ? priceState(quote.price, quote.refPrice, quote.ceilingPrice, quote.floorPrice) : "ref";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="glow-radial pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <CompanyLogo symbol={symbol} size={36} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{symbol}</h1>
              {meta && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  {meta.exchange}
                </span>
              )}
              <WatchlistButton symbol={symbol} />
            </div>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              {meta ? `${meta.name} · ${meta.industry}` : "Không có thông tin công ty"}
            </p>
          </div>
        </div>

        {quoteLoading && <div className="h-12 w-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />}
        {!quoteLoading && (quoteError || quotesData?.failed.includes(symbol)) && (
          <div className="text-sm text-red-600 dark:text-red-400">Không thể tải giá cho {symbol}.</div>
        )}
        {quote && (
          <div className="text-right">
            <div className={clsx("text-3xl font-bold tabular-nums", PRICE_COLOR[state])}>{formatPrice(quote.price)}</div>
            <div className={clsx("text-sm font-medium tabular-nums", PRICE_COLOR[state])}>
              {formatChange(quote.change)} ({formatPercent(quote.changePercent)})
            </div>
            <div className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{formatDateTime(quote.updatedAt)}</div>
          </div>
        )}
      </div>

      {quote && (
        <div className="relative mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-neutral-600 dark:text-neutral-300">
          <span>
            Khối lượng: <span className="font-semibold tabular-nums">{formatVolume(quote.volume)}</span>
          </span>
          {metrics?.relativeVolumePercent != null && (
            <span className={clsx("text-xs tabular-nums", signColor(metrics.relativeVolumePercent))}>
              ({formatPercent(metrics.relativeVolumePercent)} so với TB 20 phiên trước)
            </span>
          )}
        </div>
      )}

      <div className="relative mt-4 flex gap-1 border-b border-neutral-100 text-sm font-semibold dark:border-neutral-800">
        <span className="border-b-2 border-brand-600 px-1 pb-2 text-brand-700 dark:text-brand-300">Tổng quan</span>
        <button
          type="button"
          onClick={scrollToFinancials}
          className="px-3 pb-2 text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200"
        >
          Tài chính
        </button>
      </div>

      {quote && (
        <div className="relative mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Mở cửa" value={formatPrice(quote.open)} />
          <Stat label="Cao nhất" value={formatPrice(quote.high)} />
          <Stat label="Thấp nhất" value={formatPrice(quote.low)} />
          <Stat label="Tham chiếu" value={formatPrice(quote.refPrice)} valueClass="text-amber-600 dark:text-amber-300" />
          <Stat label="Trần" value={formatPrice(quote.ceilingPrice)} valueClass="text-fuchsia-600 dark:text-fuchsia-400" />
          <Stat label="Sàn" value={formatPrice(quote.floorPrice)} valueClass="text-sky-600 dark:text-sky-400" />
        </div>
      )}

      <div className="relative mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          Chỉ số cơ bản
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Vốn hóa" value={formatRatioDisplay(metrics?.marketCap)} />
          <Stat label="TB GTGD 20 phiên" value={formatCompactVnd(metrics?.avgTradingValue20d ?? null)} />
          <Stat label="P/E" value={formatRatioDisplay(metrics?.pe)} />
          <Stat label="P/B" value={formatRatioDisplay(metrics?.pb)} />
          <Stat label="ROE" value={formatRatioDisplay(metrics?.roe)} />
          <Stat
            label="RS"
            value={rs ? `${rs.rank}/${rs.total}` : "--"}
            title="Xếp hạng hiệu suất giá 3 tháng gần nhất trong nhóm khoảng 50 mã theo dõi trên trang (không phải toàn thị trường), hạng 1 là mạnh nhất."
          />
          <Stat
            label="+/- ĐT quý gần nhất"
            value={formatPercent(metrics?.revenueQoqChangePercent ?? NaN)}
            valueClass={signColor(metrics?.revenueQoqChangePercent)}
          />
          <Stat
            label="+/- LN quý gần nhất"
            value={formatPercent(metrics?.profitQoqChangePercent ?? NaN)}
            valueClass={signColor(metrics?.profitQoqChangePercent)}
          />
        </dl>
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
          Vốn hóa/P/E/P/B/ROE: KB Securities (KBS), theo quý gần nhất. TB GTGD 20 phiên: tính từ giá đóng cửa × khối
          lượng 20 phiên gần nhất (VNDirect). RS: xếp hạng nội bộ, không phải khuyến nghị đầu tư.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
  title,
}: {
  label: string;
  value: string;
  valueClass?: string;
  title?: string;
}) {
  return (
    <div title={title}>
      <div className="text-xs text-neutral-400 dark:text-neutral-500">{label}</div>
      <div className={clsx("font-semibold tabular-nums", valueClass ?? "text-neutral-900 dark:text-neutral-100")}>
        {value}
      </div>
    </div>
  );
}
