import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchFinancials, fetchHistory, fetchQuote } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import StockTable from "../components/StockTable";
import StockSummaryCard from "../components/StockSummaryCard";
import { extractKeyRatios, type KeyRatios } from "../utils/ratios";
import { generateDailyAlerts, type AlertType, type DailyAlert } from "../utils/alerts";
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

  const alerts = useMemo(
    () => (data ? data.flatMap((d) => generateDailyAlerts(d.quote.symbol, d.points)) : []),
    [data]
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
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

      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

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

      {data && data.length > 0 && view === "table" && (
        <StockTable
          quotes={data.map((d) => d.quote)}
          ratios={Object.fromEntries(
            data.filter((d) => d.ratios).map((d) => [d.quote.symbol, d.ratios!])
          )}
        />
      )}

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

const ALERT_BADGE: Record<AlertType, string> = {
  OVERSOLD: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  BUY: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  REVERSAL: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
};

// Three daily signal checks (RSI oversold, MACD golden cross, Supertrend
// reversal) computed from the same 3M history Watchlist already fetches for
// its sparklines — ported from a user-supplied Python reference, no extra
// requests needed.
function AlertsPanel({ alerts }: { alerts: DailyAlert[] }) {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">🔔 Cảnh báo hôm nay</h2>
      <div className="flex flex-col gap-2">
        {alerts.map((a, i) => (
          <Link
            key={`${a.symbol}-${a.indicator}-${i}`}
            to={`/stock/${a.symbol}`}
            className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ALERT_BADGE[a.type]}`}>{a.indicator}</span>
            <span className="text-slate-700 dark:text-slate-300">{a.message}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
