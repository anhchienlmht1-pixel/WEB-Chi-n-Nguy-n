import { useMemo, useState } from "react";
import { fetchMarketOverview, fetchMarketBoard, fetchMoneyFlow } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import StockTable from "../components/StockTable";
import TopTraded from "../components/TopTraded";
import MarketMovers from "../components/MarketMovers";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import Hero from "../components/Hero";
import TrendSignalScanner from "../components/TrendSignalScanner";
import MarketSentiment from "../components/MarketSentiment";
import type { TopExchange } from "../types";

const DEFAULT_SYMBOL = "VNINDEX";

// "Mã theo dõi" is the curated ~70-symbol watchlist (fast, always the
// dashboard default); the exchange tabs pull the full ~1,600-symbol board
// via /market/board — kept as a separate opt-in fetch below (not the
// default) since rendering/scanning the whole exchange is heavier and the
// curated list already covers what the chart/top-movers sections use.
type BoardMode = "watchlist" | TopExchange;

const BOARD_TABS: { key: BoardMode; label: string }[] = [
  { key: "watchlist", label: "Mã theo dõi" },
  { key: "ALL", label: "Toàn sàn" },
  { key: "HOSE", label: "HOSE" },
  { key: "HNX", label: "HNX" },
  { key: "UPCOM", label: "UPCOM" },
];

export default function Dashboard() {
  const { data } = usePolling(fetchMarketOverview, [], 30000);
  const [boardMode, setBoardMode] = useState<BoardMode>("watchlist");
  const {
    data: boardData,
    error: boardError,
    loading: boardLoading,
  } = usePolling(
    () => (boardMode === "watchlist" ? fetchMarketOverview() : fetchMarketBoard(boardMode)),
    [boardMode],
    30000
  );
  // "Sức mạnh dòng tiền" sheet barely changes intraday — 5 min matches the
  // server's own cache TTL (server/src/routes/stocks.ts's /money-flow), no
  // point polling faster than the data can actually change.
  const { data: moneyFlowData, error: moneyFlowError } = usePolling(fetchMoneyFlow, [], 5 * 60 * 1000);
  const moneyFlow = useMemo(() => {
    if (!moneyFlowData) return undefined;
    return Object.fromEntries(moneyFlowData.items.map((r) => [r.symbol, r]));
  }, [moneyFlowData]);
  const { symbols: watchlist } = useWatchlist();
  const [chartSymbol, setChartSymbol] = useState(watchlist[0] ?? DEFAULT_SYMBOL);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <Hero />

      <MarketSentiment />

      <div className="mb-6">
        <h1 className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">Biểu đồ kỹ thuật</h1>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <TechnicalChartPanel
              symbol={chartSymbol}
              height={480}
              onSymbolChange={setChartSymbol}
              // /market/overview isn't behind the quote/history fallback chain
              // yet, so this is undefined today — kept so the chart already
              // picks up a source the moment that endpoint gains one too.
              preferSource={data?.quotes.find((q) => q.symbol === chartSymbol)?.source}
            />
          </div>
          <div className="w-full shrink-0 lg:w-80">
            <TrendSignalScanner />
          </div>
        </div>
      </div>

      <TopTraded />

      {data && data.quotes.length > 0 && <MarketMovers quotes={data.quotes} />}

      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Tổng quan thị trường
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
            {BOARD_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setBoardMode(tab.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  boardMode === tab.key
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {boardData?.provider && (
            <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nguồn dữ liệu: {boardData.provider}
            </span>
          )}
        </div>
      </div>

      {boardLoading && !boardData && (
        <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>
      )}
      {boardError && !boardData && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải dữ liệu</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{boardError}</p>
          <p className="mt-2 text-xs text-slate-500">
            {boardMode === "watchlist"
              ? "Kiểm tra cấu hình DATA_PROVIDER trên server (Vercel → Settings → Environment Variables), sau đó Redeploy."
              : "Bảng toàn sàn dùng riêng nguồn vnstock (VCI) — nếu nguồn này đang lỗi, thử lại 'Mã theo dõi' trong lúc chờ."}
          </p>
        </div>
      )}
      {boardData && boardData.quotes.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">Không có mã nào để hiển thị.</p>
      )}
      {/* Surfaced instead of silently hidden — a failed money-flow fetch
          used to just make the "Dòng tiền" column vanish with no clue why. */}
      {boardMode === "watchlist" && moneyFlowError && !moneyFlowData && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-medium">Không tải được cột "Sức mạnh dòng tiền": </span>
          {moneyFlowError}
        </div>
      )}
      {boardData && boardData.quotes.length > 0 && (
        <StockTable
          quotes={boardData.quotes}
          moneyFlow={boardMode === "watchlist" ? moneyFlow : undefined}
        />
      )}
    </div>
  );
}
