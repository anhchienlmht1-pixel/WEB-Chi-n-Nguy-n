import { useEffect, useMemo, useState } from "react";
import { fetchQuote } from "../api/client";
import { useWatchlist } from "../hooks/useWatchlist";
import StockTable from "../components/StockTable";
import type { Quote } from "../types";

export default function Watchlist() {
  const { symbols: watchedSymbols } = useWatchlist();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch quotes for all watched symbols
  useEffect(() => {
    if (watchedSymbols.length === 0) {
      setQuotes([]);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all(watchedSymbols.map((s) => fetchQuote(s)))
      .then((results) => {
        setQuotes(results);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Không tải được dữ liệu");
        setLoading(false);
      });
  }, [watchedSymbols]);

  // Calculate portfolio stats
  const stats = useMemo(() => {
    if (quotes.length === 0) {
      return { totalValue: 0, totalChange: 0, totalChangePercent: 0, gainers: 0, losers: 0 };
    }

    let totalValue = 0;
    let totalChange = 0;
    let gainers = 0;
    let losers = 0;

    quotes.forEach((q) => {
      if (q.price) totalValue += q.price;
      totalChange += q.change || 0;
      if (q.changePercent > 0) gainers++;
      else if (q.changePercent < 0) losers++;
    });

    const avgChangePercent = quotes.length > 0 ? totalChange / quotes.length : 0;

    return {
      totalValue,
      totalChange,
      totalChangePercent: avgChangePercent,
      gainers,
      losers,
    };
  }, [quotes]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">Danh mục cá nhân</h2>
        <h1 className="mt-1 mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
          ⭐ Danh sách theo dõi
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Quản lý các mã cổ phiếu yêu thích của bạn
        </p>
      </div>

      {watchedSymbols.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bạn chưa thêm mã nào</p>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Bấm nút ⭐ trên các mã cổ phiếu để thêm vào danh sách theo dõi
          </p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Tổng mã theo dõi</div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {quotes.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Tăng giá</div>
              <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.gainers}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Giảm giá</div>
              <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.losers}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Tb cộng</div>
              <div
                className={`mt-1 text-2xl font-bold tabular-nums ${
                  stats.totalChangePercent > 0
                    ? "text-green-600 dark:text-green-400"
                    : stats.totalChangePercent < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {stats.totalChangePercent >= 0 ? "+" : ""}
                {stats.totalChangePercent.toFixed(2)}%
              </div>
            </div>
          </div>

          {loading && <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              Lỗi tải dữ liệu: {error}
            </div>
          )}
          {!loading && quotes.length > 0 && <StockTable quotes={quotes} />}
        </>
      )}
    </div>
  );
}
