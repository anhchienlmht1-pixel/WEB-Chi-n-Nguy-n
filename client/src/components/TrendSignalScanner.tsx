import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchTrendBuySignals } from "../api/client";
import { formatPercent, formatPrice } from "../utils/format";
import { useWatchlist } from "../hooks/useWatchlist";
import WatchButton from "./WatchButton";

const POLL_MS = 5 * 60 * 1000; // server caches the scan for 1h — no point polling faster

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// Lists every stock in the universe currently on a buy signal per the same
// trend-following combo as the chart's own Mua/Bán markers (SMA20 > SMA50,
// ADX(14) > 25, Supertrend(10,3) uptrend) — computed once server-side
// across ~70 symbols and cached, rather than the browser looping through
// dozens of per-symbol history fetches itself.
export default function TrendSignalScanner({
  onSelectSymbol,
}: {
  /** Switches the chart sitting next to this panel to the clicked symbol
   * in place, instead of navigating away to the stock detail page —
   * passed on every page that renders this beside a TechnicalChartPanel.
   * Falls back to a normal /stock/:symbol navigation when omitted. */
  onSelectSymbol?: (symbol: string) => void;
}) {
  const { data: hits, error, loading } = usePolling(() => fetchTrendBuySignals(), [], POLL_MS);
  const { addMany } = useWatchlist();

  if (loading && !hits) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Tín hiệu MUA (Trend Following)
        </h4>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !hits) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-red-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-red-400">
        Không tải được danh sách tín hiệu: {error}
      </div>
    );
  }

  if (!hits) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tín hiệu MUA (Trend Following)</h4>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            {hits.length} mã đang trong xu hướng tăng, chưa xuất hiện điểm bán (SMA20&gt;SMA50, ADX(14)&gt;25,
            Supertrend(10,3)) — quét toàn bộ danh mục, cập nhật mỗi giờ.
          </p>
        </div>
        {hits.length > 0 && (
          <button
            type="button"
            onClick={() => addMany(hits.map((h) => h.symbol))}
            className="shrink-0 whitespace-nowrap rounded-md border border-amber-500 px-2.5 py-1 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/10 dark:border-amber-400 dark:text-amber-400"
          >
            ★ Thêm tất cả vào Theo dõi
          </button>
        )}
      </div>

      {hits.length === 0 ? (
        <p className="p-4 text-sm text-slate-400 dark:text-slate-500">
          Hiện không có mã nào khớp đủ 3 điều kiện của tín hiệu MUA.
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {hits.map((h) => {
            // WatchButton is its own <button> — kept as a sibling rather
            // than nested inside the row's own clickable element, since a
            // <button> (or an <a>) can't validly contain another <button>.
            const nameBlock = (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{h.symbol}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{h.exchange}</span>
                </div>
                <div className="truncate text-xs text-slate-400 dark:text-slate-500">Từ {formatSince(h.signalSince)}</div>
              </div>
            );
            const priceBlock = (
              <div className="shrink-0 text-right">
                <div className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                  {formatPrice(h.price, h.currency)}
                </div>
                <div
                  className={`text-xs tabular-nums ${
                    h.changePercent > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : h.changePercent < 0
                        ? "text-red-500 dark:text-red-400"
                        : "text-slate-400"
                  }`}
                >
                  {formatPercent(h.changePercent)}
                </div>
              </div>
            );
            const rowClass = "flex min-w-0 flex-1 items-center justify-between gap-2 text-left";
            // Switches the sibling chart in place when one's provided
            // (Dashboard/THỰC CHIẾN CP both render this next to a chart);
            // otherwise falls back to navigating to the stock detail page.
            return (
              <div
                key={h.symbol}
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
              >
                <WatchButton symbol={h.symbol} />
                {onSelectSymbol ? (
                  <button type="button" onClick={() => onSelectSymbol(h.symbol)} className={rowClass}>
                    {nameBlock}
                    {priceBlock}
                  </button>
                ) : (
                  <Link to={`/stock/${h.symbol}`} className={rowClass}>
                    {nameBlock}
                    {priceBlock}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
