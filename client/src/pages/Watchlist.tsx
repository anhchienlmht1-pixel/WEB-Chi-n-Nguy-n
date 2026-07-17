import { useCallback, useState } from "react";
import { fetchFinancials, fetchHistory, fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import StockTable from "../components/StockTable";
import StockSummaryCard from "../components/StockSummaryCard";
import { extractKeyRatios, type KeyRatios } from "../utils/ratios";
import type { HistoryPoint, Quote } from "../types";

type ViewMode = "cards" | "table";

interface WatchlistEntry {
  quote: Quote;
  points: HistoryPoint[];
  ratios: KeyRatios | undefined;
}

export default function Watchlist() {
  const { symbols } = useWatchlist();
  const [view, setView] = useState<ViewMode>("cards");

  const fetcher = useCallback(async (): Promise<WatchlistEntry[]> => {
    const results = await Promise.allSettled(
      symbols.map(async (s) => {
        const [quote, history] = await Promise.all([fetchQuote(s), fetchHistory(s, "3M")]);
        let ratios: KeyRatios | undefined;
        try {
          ratios = extractKeyRatios(await fetchFinancials(s, "CSTC", "year"));
        } catch {
          ratios = undefined; // P/E & ROE are a nice-to-have — don't fail the whole card for it.
        }
        return { quote, points: history.points, ratios };
      })
    );
    return results
      .filter((r): r is PromiseFulfilledResult<WatchlistEntry> => r.status === "fulfilled")
      .map((r) => r.value);
  }, [symbols]);

  const { data, loading, error } = usePolling(fetcher, [symbols.join(",")], 30000);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Danh sách theo dõi</h1>
        {data && data.length > 0 && (
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1 text-xs font-medium dark:border-slate-800">
            {(["cards", "table"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  view === v
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {v === "cards" ? "Thẻ" : "Bảng"}
              </button>
            ))}
          </div>
        )}
      </div>

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

      {data && data.length > 0 && view === "table" && <StockTable quotes={data.map((d) => d.quote)} />}

      {data && data.length > 0 && view === "cards" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((d) => (
            <StockSummaryCard key={d.quote.symbol} quote={d.quote} points={d.points} ratios={d.ratios} />
          ))}
        </div>
      )}
    </div>
  );
}
