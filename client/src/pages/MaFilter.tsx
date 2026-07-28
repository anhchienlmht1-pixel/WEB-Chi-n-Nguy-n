import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMaScan, MA_PERIODS, type MaPeriod } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import { formatPercent, formatPrice, trendClass } from "../utils/format";

const POLL_MS = 5 * 60 * 1000; // server caches the scan for 1h — no point polling faster

type Direction = "above" | "below";

function formatGap(gapPercent: number): string {
  const sign = gapPercent > 0 ? "+" : "";
  return `${sign}${gapPercent.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
}

// Screener: lists stocks whose latest close is above (or below) a chosen
// simple moving average, using the same SMA computation the chart's own MA
// indicator and trend-signal scanner already use — see
// server/src/signals/maScanner.ts, which computes every supported period
// (10/20/50/100/200) in one pass so switching periods here is instant.
export default function MaFilter() {
  const { data: hits, error, loading } = usePolling(() => fetchMaScan(), [], POLL_MS);
  const { addMany } = useWatchlist();
  const [period, setPeriod] = useState<MaPeriod>(20);
  const [direction, setDirection] = useState<Direction>("above");

  const filtered = useMemo(() => {
    if (!hits) return [];
    return hits
      .map((h) => {
        const ma = h.ma[period];
        if (ma == null || ma <= 0) return null;
        const gapPercent = ((h.price - ma) / ma) * 100;
        return { ...h, ma, gapPercent };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null)
      .filter((h) => (direction === "above" ? h.price > h.ma : h.price < h.ma))
      .sort((a, b) => (direction === "above" ? b.gapPercent - a.gapPercent : a.gapPercent - b.gapPercent));
  }, [hits, period, direction]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-slate-100">Bộ lọc MA</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Lọc cổ phiếu có giá đóng cửa gần nhất nằm trên/dưới đường trung bình động (MA) — quét toàn bộ danh mục, cập
        nhật mỗi giờ.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-0.5 rounded-md border border-slate-200 p-0.5 text-xs font-medium dark:border-slate-700">
          {MA_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded px-3 py-1.5 transition-colors ${
                period === p
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              MA{p}
            </button>
          ))}
        </div>

        <div className="flex gap-0.5 rounded-md border border-slate-200 p-0.5 text-xs font-medium dark:border-slate-700">
          <button
            type="button"
            onClick={() => setDirection("above")}
            className={`rounded px-3 py-1.5 transition-colors ${
              direction === "above"
                ? "bg-emerald-500 text-slate-950"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            Trên MA
          </button>
          <button
            type="button"
            onClick={() => setDirection("below")}
            className={`rounded px-3 py-1.5 transition-colors ${
              direction === "below"
                ? "bg-red-500 text-slate-950"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            Dưới MA
          </button>
        </div>

        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => addMany(filtered.map((h) => h.symbol))}
            className="rounded-md border border-amber-500 px-2.5 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/10 dark:border-amber-400 dark:text-amber-400"
          >
            ★ Thêm tất cả vào Theo dõi
          </button>
        )}

        <span className="text-xs text-slate-400 dark:text-slate-500">{filtered.length} mã khớp điều kiện</span>
      </div>

      {loading && !hits && <p className="text-slate-500 dark:text-slate-400">Đang quét dữ liệu...</p>}

      {error && !hits && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải dữ liệu</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
        </div>
      )}

      {hits && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3 text-right">Giá</th>
                <th className="px-4 py-3 text-right">% Thay đổi</th>
                <th className="px-4 py-3 text-right">MA{period}</th>
                <th className="px-4 py-3 text-right">Chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                    Không có mã nào khớp điều kiện.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr
                    key={h.symbol}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-2.5">
                      <Link to={`/stock/${h.symbol}`} className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{h.symbol}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{h.exchange}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {formatPrice(h.price, h.currency)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${trendClass(h.changePercent)}`}>
                      {formatPercent(h.changePercent)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {formatPrice(h.ma, h.currency)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                        h.gapPercent > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : h.gapPercent < 0
                            ? "text-red-500 dark:text-red-400"
                            : "text-slate-500"
                      }`}
                    >
                      {formatGap(h.gapPercent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
