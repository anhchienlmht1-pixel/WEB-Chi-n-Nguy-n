import { useMemo, useState } from "react";
import { fetchMarketOverview, fetchMoneyFlow } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import StockTable from "../components/StockTable";
import TopTraded from "../components/TopTraded";
import MarketMovers from "../components/MarketMovers";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import Hero from "../components/Hero";
import TrendSignalScanner from "../components/TrendSignalScanner";

const DEFAULT_SYMBOL = "VNINDEX";

export default function Dashboard() {
  const { data, error, loading } = usePolling(fetchMarketOverview, [], 30000);
  // "Sức mạnh dòng tiền" sheet barely changes intraday — 5 min matches the
  // server's own cache TTL (server/src/routes/stocks.ts's /money-flow), no
  // point polling faster than the data can actually change.
  const { data: moneyFlowData } = usePolling(fetchMoneyFlow, [], 5 * 60 * 1000);
  const moneyFlow = useMemo(() => {
    if (!moneyFlowData) return undefined;
    return Object.fromEntries(moneyFlowData.items.map((r) => [r.symbol, r]));
  }, [moneyFlowData]);
  const { symbols: watchlist } = useWatchlist();
  const [chartSymbol, setChartSymbol] = useState(watchlist[0] ?? DEFAULT_SYMBOL);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <Hero />

      <div className="mb-6">
        <h1 className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">Biểu đồ kỹ thuật</h1>
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

      <div className="mb-6">
        <TrendSignalScanner />
      </div>

      <TopTraded />

      {data && data.quotes.length > 0 && <MarketMovers quotes={data.quotes} />}

      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Tổng quan thị trường
        </h1>
        {data?.provider && (
          <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nguồn dữ liệu: {data.provider}
          </span>
        )}
      </div>

      {loading && !data && (
        <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</p>
      )}
      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải dữ liệu</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
          <p className="mt-2 text-xs text-slate-500">
            Kiểm tra cấu hình DATA_PROVIDER trên server (Vercel → Settings → Environment
            Variables), sau đó Redeploy.
          </p>
        </div>
      )}
      {data && data.quotes.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">Không có mã nào để hiển thị.</p>
      )}
      {data && data.quotes.length > 0 && <StockTable quotes={data.quotes} moneyFlow={moneyFlow} />}
    </div>
  );
}
