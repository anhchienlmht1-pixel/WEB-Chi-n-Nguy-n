import type { ReactNode } from "react";
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

// Whole days between the buy date and today, so the user reads "đang nắm giữ
// N ngày" instead of decoding a bare date.
function daysHeld(iso: string): number {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  const diff = Date.now() - start;
  return Math.max(0, Math.floor(diff / 86_400_000));
}

// Reusable card shell so the loading / error / empty / list states all share
// the same header and framing — the panel never "jumps" between states.
function Panel({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 bg-gradient-to-r from-green-50/60 to-transparent p-4 dark:border-slate-800 dark:from-green-950/20">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-green-100 text-sm dark:bg-green-950/50">
            📈
          </span>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tín hiệu MUA</h4>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {subtitle ?? "Cổ phiếu đang trong xu hướng tăng và chưa xuất hiện điểm bán."}
        </p>
      </div>
      {children}
    </div>
  );
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
  const { data: hits, error, loading, refetch } = usePolling(() => fetchTrendBuySignals(), [], POLL_MS);
  const { addMany } = useWatchlist();

  // First load — the server scans ~70 symbols, so tell the user it's working
  // instead of leaving a bare spinner that reads as "broken".
  if (loading && !hits) {
    return (
      <Panel subtitle="Đang quét toàn bộ thị trường để tìm cổ phiếu đang tăng giá…">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
              <div className="h-6 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  // Friendly, non-technical error with a retry — a cold-cache scan can exceed
  // the request timeout, which is normal on the very first visit.
  if (error && !hits) {
    const isTimeout = /timeout/i.test(error);
    return (
      <Panel subtitle="Cổ phiếu đang trong xu hướng tăng và chưa xuất hiện điểm bán.">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-slate-800">
            ⏳
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {isTimeout ? "Đang tổng hợp dữ liệu thị trường" : "Chưa tải được danh sách tín hiệu"}
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {isTimeout
              ? "Lần tải đầu tiên hệ thống cần quét khoảng 70 mã nên có thể mất vài giây. Bạn hãy thử lại nhé."
              : "Có thể do kết nối tạm thời gián đoạn. Vui lòng thử lại sau giây lát."}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-1 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            ↻ Thử lại
          </button>
        </div>
      </Panel>
    );
  }

  if (!hits) return null;

  const subtitle = (
    <>
      <span className="font-medium text-green-700 dark:text-green-400">{hits.length} cổ phiếu</span> đang trong xu hướng
      tăng, chưa xuất hiện điểm bán.
      <span
        className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500"
        title="Điều kiện: SMA20 > SMA50, ADX(14) > 25 và Supertrend(10,3) đang báo tăng"
      >
        Hệ thống Trend Following · cập nhật mỗi giờ ⓘ
      </span>
    </>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-green-50/60 to-transparent p-4 dark:border-slate-800 dark:from-green-950/20">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-green-100 text-sm dark:bg-green-950/50">
              📈
            </span>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tín hiệu MUA</h4>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        {hits.length > 0 && (
          <button
            type="button"
            onClick={() => addMany(hits.map((h) => h.symbol))}
            title="Thêm tất cả mã trong danh sách vào mục theo dõi của bạn"
            className="shrink-0 whitespace-nowrap rounded-md border border-green-600 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition-all hover:bg-green-100 dark:border-green-500/50 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/50"
          >
            ★ Theo dõi tất cả
          </button>
        )}
      </div>

      {hits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-slate-800">
            🔍
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Chưa có mã nào khớp tín hiệu MUA</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Hiện không cổ phiếu nào hội đủ 3 điều kiện của xu hướng tăng. Danh sách sẽ tự cập nhật mỗi giờ.
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {hits.map((h) => {
            const held = daysHeld(h.buyDate);
            // WatchButton is its own <button> — kept as a sibling rather
            // than nested inside the row's own clickable element, since a
            // <button> (or an <a>) can't validly contain another <button>.
            const nameBlock = (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{h.symbol}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{h.exchange}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950/40 dark:text-green-400">
                    ● Đang mua
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {held > 0 ? `${held} ngày` : "hôm nay"} · từ {formatSince(h.buyDate)}
                  </span>
                </div>
              </div>
            );
            const priceBlock = (
              <div className="shrink-0 text-right">
                <div className="tabular-nums font-medium text-slate-900 dark:text-slate-100">
                  {formatPrice(h.price, h.currency)}
                </div>
                <div
                  className={`text-xs tabular-nums font-medium ${
                    h.changePercent > 0
                      ? "text-green-600 dark:text-green-400"
                      : h.changePercent < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-400"
                  }`}
                  title="Biến động giá trong ngày hôm nay"
                >
                  {h.changePercent > 0 ? "▲" : h.changePercent < 0 ? "▼" : ""} {formatPercent(h.changePercent)}
                </div>
                <div
                  className={`mt-1 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                    h.signalReturnPercent > 0
                      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                      : h.signalReturnPercent < 0
                        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                  title={`Lãi/lỗ tích lũy từ giá lúc vào tín hiệu (${formatPrice(h.buyPrice, h.currency)}) đến giá hiện tại`}
                >
                  {formatPercent(h.signalReturnPercent)} từ tín hiệu
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
                className="flex items-center gap-2 border-b border-l-4 border-l-green-500 border-slate-100 px-4 py-3 last:border-b-0 transition-colors hover:bg-green-50/40 dark:border-slate-900 dark:border-l-green-500/60 dark:hover:bg-green-950/20"
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
