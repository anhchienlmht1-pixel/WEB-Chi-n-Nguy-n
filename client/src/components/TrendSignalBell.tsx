import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { useTrendSignalNotifications } from "../hooks/useTrendSignalNotifications";
import { formatPercent, formatPrice } from "../utils/format";

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// Site-wide notification bell for the trend-following buy scan (same
// SMA20>SMA50 / ADX(14)>25 / Supertrend(10,3) combo as TrendSignalScanner
// on the dashboard and the chart's own Mua/Bán markers) — so a fresh
// signal is visible from any page, not just when scrolled to that section.
export default function TrendSignalBell() {
  const { hits, newHits, acknowledge, permission, requestPermission } = useTrendSignalNotifications();
  const [open, setOpen] = useState(false);

  function toggle() {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) acknowledge();
      return next;
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        title="Tín hiệu MUA (Trend Following)"
        aria-label="Tín hiệu MUA (Trend Following)"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 transition-colors duration-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" strokeWidth={1.75} />
        {newHits.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-800 px-1 text-[10px] font-bold leading-none text-white">
            {newHits.length > 9 ? "9+" : newHits.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-outside-to-close backdrop. */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Tín hiệu MUA (Trend Following)
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                SMA20&gt;SMA50, ADX(14)&gt;25, Supertrend(10,3) tăng
              </div>
            </div>

            {permission !== "unsupported" && permission !== "granted" && (
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                {permission === "denied" ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Thông báo trình duyệt đang bị chặn — vào cài đặt trình duyệt cho trang này để bật lại.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={requestPermission}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-300 hover:bg-slate-700"
                  >
                    <Bell className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Bật thông báo trình duyệt khi có tín hiệu mới
                  </button>
                )}
              </div>
            )}
            {permission === "granted" && (
              <div className="flex items-center gap-1.5 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <Check className="h-3 w-3" strokeWidth={2} />
                Đã bật thông báo trình duyệt
              </div>
            )}

            {hits.length === 0 ? (
              <p className="p-3 text-sm text-slate-400 dark:text-slate-500">
                Hiện chưa có mã nào khớp đủ 3 điều kiện của tín hiệu MUA.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {hits.map((h) => (
                  <Link
                    key={h.symbol}
                    to={`/stock/${h.symbol}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-800/60"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{h.symbol}</span>
                      <span className="ml-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                        Từ {formatSince(h.signalSince)}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular-nums text-slate-900 dark:text-slate-100">
                        {formatPrice(h.price, h.currency)}
                      </div>
                      <div
                        className={`text-xs tabular-nums ${
                          h.changePercent >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
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
        </>
      )}
    </div>
  );
}
