import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Star, Clock, RefreshCw, Search } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchBStarSignals } from "../api/client";
import { formatPercent, formatPrice } from "../utils/format";
import { useWatchlist } from "../hooks/useWatchlist";
import WatchButton from "./WatchButton";

const POLL_MS = 5 * 60 * 1000; // background scan itself only moves every few minutes

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function daysHeld(iso: string): number {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  const diff = Date.now() - start;
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function Panel({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-950/50">
            <Star className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" strokeWidth={2} />
          </span>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tín hiệu B★</h4>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {subtitle ?? "Cổ phiếu vừa breakout khỏi nền giá chặt trên khối lượng lớn."}
        </p>
      </div>
      {children}
    </div>
  );
}

// Whole-universe scan of the B★ breakout combo — tight ≤5-tuần base,
// breakout trên khối lượng ≥1.4x trung bình, giá trên MA50 — cùng nguồn
// quét nền với TrendSignalScanner nhưng là hệ tín hiệu độc lập (xem
// server/src/signals/bstarScanner.ts).
export default function BStarScanner({
  onSelectSymbol,
}: {
  /** Switches the chart sitting next to this panel to the clicked symbol
   * in place, instead of navigating away to the stock detail page. */
  onSelectSymbol?: (symbol: string) => void;
}) {
  const { data: hits, error, loading, refetch } = usePolling(() => fetchBStarSignals(), [], POLL_MS);
  const { addMany } = useWatchlist();

  if (loading && !hits) {
    return (
      <Panel subtitle="Đang quét toàn bộ thị trường để tìm điểm breakout…">
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

  if (error && !hits) {
    const isTimeout = /timeout/i.test(error);
    return (
      <Panel subtitle="Cổ phiếu vừa breakout khỏi nền giá chặt trên khối lượng lớn.">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Clock className="h-5 w-5 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {isTimeout ? "Đang tổng hợp dữ liệu thị trường" : "Chưa tải được danh sách tín hiệu"}
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Có thể do kết nối tạm thời gián đoạn. Vui lòng thử lại sau giây lát.
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-300 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
            Thử lại
          </button>
        </div>
      </Panel>
    );
  }

  if (!hits) return null;

  const subtitle = (
    <>
      <span className="font-medium text-purple-700 dark:text-purple-400">{hits.length} cổ phiếu</span> vừa breakout
      khỏi nền giá chặt, khối lượng xác nhận.
      <span
        className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500"
        title="Điều kiện: nền giá ≤15% trong ≥5 tuần, breakout trên ≥1.4x KL trung bình 20 phiên, giá trên MA50"
      >
        Hệ thống B★ · cập nhật liên tục ⓘ
      </span>
    </>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-950/50">
              <Star className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" strokeWidth={2} />
            </span>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tín hiệu B★</h4>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        {hits.length > 0 && (
          <button
            type="button"
            onClick={() => addMany(hits.map((h) => h.symbol))}
            title="Thêm tất cả mã trong danh sách vào mục theo dõi của bạn"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-purple-600 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors duration-300 hover:bg-purple-100 dark:border-purple-500/50 dark:bg-purple-950/30 dark:text-purple-400 dark:hover:bg-purple-950/50"
          >
            <Star className="h-3.5 w-3.5" strokeWidth={2} />
            Theo dõi tất cả
          </button>
        )}
      </div>

      {hits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Search className="h-5 w-5 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Chưa có mã nào khớp tín hiệu B★</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Hiện không cổ phiếu nào vừa breakout khỏi nền giá chặt. Danh sách sẽ tự cập nhật khi có mã mới.
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {hits.map((h) => {
            const held = daysHeld(h.buyDate);
            const nameBlock = (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{h.symbol}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{h.exchange}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                  <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                    Đang giữ
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {held > 0 ? `${held} ngày` : "hôm nay"} · breakout {formatSince(h.buyDate)}
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
                  title={`Lãi/lỗ tích lũy từ giá lúc breakout (${formatPrice(h.buyPrice, h.currency)}) đến giá hiện tại`}
                >
                  {formatPercent(h.signalReturnPercent)} từ breakout
                </div>
              </div>
            );
            const rowClass = "flex min-w-0 flex-1 items-center justify-between gap-2 text-left";
            return (
              <div
                key={h.symbol}
                className="flex items-center gap-2 border-b border-l-4 border-l-purple-500 border-slate-100 px-4 py-3 last:border-b-0 transition-colors hover:bg-purple-50/40 dark:border-slate-900 dark:border-l-purple-500/60 dark:hover:bg-purple-950/20"
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
