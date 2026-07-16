import { useCallback } from "react";
import { fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import StockTable from "../components/StockTable";
import type { Quote } from "../types";

export default function Watchlist() {
  const { symbols } = useWatchlist();

  const fetcher = useCallback(async (): Promise<Quote[]> => {
    const results = await Promise.allSettled(symbols.map((s) => fetchQuote(s)));
    return results
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
      .map((r) => r.value);
  }, [symbols]);

  const { data, loading, error } = usePolling(fetcher, [symbols.join(",")], 30000);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">
        Danh sách theo dõi
      </h1>

      {symbols.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">
          Chưa có mã nào trong danh sách theo dõi. Bấm biểu tượng ☆ trên trang thị trường hoặc chi
          tiết mã để thêm.
        </p>
      )}

      {symbols.length > 0 && loading && !data && (
        <p className="text-slate-500 dark:text-slate-400">Đang tải...</p>
      )}
      {error && !data && (
        <p className="text-red-500 dark:text-red-400">Lỗi tải dữ liệu: {error}</p>
      )}
      {data && data.length > 0 && <StockTable quotes={data} />}
    </div>
  );
}
