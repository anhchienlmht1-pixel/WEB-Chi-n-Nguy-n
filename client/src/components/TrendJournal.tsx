import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchTradeJournal } from "../api/client";
import { formatPrice, formatPercent } from "../utils/format";

const POLL_MS = 5 * 60 * 1000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Real, forward-only trade log — every completed buy→sell deal the
// system's own Mua/Bán combo (SMA20 > SMA50, ADX(14) > 25,
// Supertrend(10,3)) has actually signaled since it started being recorded
// (see server/src/signals/tradeJournal.ts), not a backtest reconstructed
// from historical prices. Complements TrendSignalScanner (positions still
// open) by answering "how did the deals that already closed turn out".
export default function TrendJournal() {
  const { data: journal, error, loading } = usePolling(() => fetchTradeJournal(), [], POLL_MS);

  if (loading && !journal) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <History className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
            Nhật ký giao dịch
          </h4>
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !journal) return null;
  if (!journal) return null;

  const { startDate, open, closed } = journal;
  const winCount = closed.filter((t) => t.returnPercent > 0).length;
  const lossCount = closed.filter((t) => t.returnPercent < 0).length;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <History className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Nhật ký giao dịch
        </h4>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {closed.length === 0 ? (
            <>Chưa có deal nào đóng — nhật ký ghi nhận tín hiệu thật từ {formatDate(startDate)}, sẽ tự cập nhật khi tín hiệu Bán xuất hiện.</>
          ) : (
            <>
              <span className="font-medium text-slate-700 dark:text-slate-200">{closed.length} deal</span> đã đóng ·{" "}
              <span className="text-green-600 dark:text-green-400">{winCount} lãi</span> /{" "}
              <span className="text-red-600 dark:text-red-400">{lossCount} lỗ</span> · {open.length} vị thế đang mở
            </>
          )}
        </p>
      </div>

      {closed.length > 0 && (
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90">
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-3 py-2 font-medium">Mã</th>
                <th className="px-3 py-2 font-medium">Mua</th>
                <th className="px-3 py-2 font-medium">Bán</th>
                <th className="px-3 py-2 text-right font-medium">Số ngày</th>
                <th className="px-3 py-2 text-right font-medium">Lãi/Lỗ</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((t, i) => (
                <tr
                  key={`${t.symbol}-${t.sellDate}-${i}`}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                >
                  <td className="px-3 py-2">
                    <Link to={`/stock/${t.symbol}`} className="font-semibold text-slate-900 hover:underline dark:text-slate-100">
                      {t.symbol}
                    </Link>
                    <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500">{t.exchange}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                    {formatDate(t.buyDate)}
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{formatPrice(t.buyPrice, t.currency)}</div>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                    {formatDate(t.sellDate)}
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{formatPrice(t.sellPrice, t.currency)}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{t.holdingDays}</td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums font-semibold ${
                      t.returnPercent > 0
                        ? "text-green-600 dark:text-green-400"
                        : t.returnPercent < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-400"
                    }`}
                  >
                    {formatPercent(t.returnPercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-900 dark:text-slate-500">
        Ghi nhận tín hiệu thật theo thời gian thực từ {formatDate(startDate)} — không phải dữ liệu backtest. Deal đóng
        khi tín hiệu Bán kích hoạt (SMA20 cắt xuống SMA50 hoặc Supertrend đảo chiều). Không phải lời khuyên đầu tư.
      </p>
    </div>
  );
}
