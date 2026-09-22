import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchClosedTrades } from "../api/client";
import { formatPrice, formatPercent } from "../utils/format";

const POLL_MS = 5 * 60 * 1000; // server caches the scan for 1h — no point polling faster

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// Lists every completed (bought AND sold) trend-following trade across the
// whole universe whose exit fell in the last 30 days — see
// server/src/signals/trendScanner.ts's scanClosedTrades. Complements
// TrendSignalScanner (which only shows positions still open) by answering
// "how did the deals that already closed actually turn out".
export default function TrendClosedTrades() {
  const { data: trades, error, loading } = usePolling(() => fetchClosedTrades(), [], POLL_MS);

  if (loading && !trades) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <History className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
            Lịch sử giao dịch đã đóng (30 ngày)
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

  if (error && !trades) return null;
  if (!trades) return null;

  const winCount = trades.filter((t) => t.returnPercent > 0).length;
  const lossCount = trades.filter((t) => t.returnPercent < 0).length;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <History className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Lịch sử giao dịch đã đóng (30 ngày)
        </h4>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {trades.length === 0 ? (
            "Chưa có giao dịch nào đóng trong 30 ngày qua."
          ) : (
            <>
              <span className="font-medium text-slate-700 dark:text-slate-200">{trades.length} giao dịch</span> đã đóng ·{" "}
              <span className="text-green-600 dark:text-green-400">{winCount} lãi</span> /{" "}
              <span className="text-red-600 dark:text-red-400">{lossCount} lỗ</span>
            </>
          )}
        </p>
      </div>

      {trades.length > 0 && (
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
              {trades.map((t, i) => (
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
        Deal đóng khi tín hiệu Bán kích hoạt (SMA20 cắt xuống SMA50 hoặc Supertrend đảo chiều). Lãi/Lỗ tính từ giá lúc
        Mua đến giá lúc Bán — không phải lời khuyên đầu tư.
      </p>
    </div>
  );
}
