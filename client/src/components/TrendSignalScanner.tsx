import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchTrendBuySignals } from "../api/client";
import { formatPercent, formatPrice } from "../utils/format";

const POLL_MS = 5 * 60 * 1000; // server caches the scan for 1h — no point polling faster

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// Lists every stock in the universe currently on a buy signal per the same
// trend-following combo as the chart's own Mua/Bán markers (SMA20 > SMA50,
// ADX(14) > 25, Supertrend(10,3) uptrend) — computed once server-side
// across ~70 symbols and cached, rather than the browser looping through
// dozens of per-symbol history fetches itself.
export default function TrendSignalScanner() {
  const { data: hits, error, loading } = usePolling(() => fetchTrendBuySignals(), [], POLL_MS);

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
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tín hiệu MUA (Trend Following)</h4>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {hits.length} mã đang trong xu hướng tăng (SMA20&gt;SMA50, ADX(14)&gt;25, Supertrend(10,3)) — quét toàn bộ
          danh mục, cập nhật mỗi giờ.
        </p>
      </div>

      {hits.length === 0 ? (
        <p className="p-4 text-sm text-slate-400 dark:text-slate-500">
          Hiện không có mã nào khớp đủ 3 điều kiện của tín hiệu MUA.
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {hits.map((h) => (
            <Link
              key={h.symbol}
              to={`/stock/${h.symbol}`}
              className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{h.symbol}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{h.exchange}</span>
                </div>
                <div className="truncate text-xs text-slate-400 dark:text-slate-500">
                  Từ {formatSince(h.signalSince)}
                </div>
              </div>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
