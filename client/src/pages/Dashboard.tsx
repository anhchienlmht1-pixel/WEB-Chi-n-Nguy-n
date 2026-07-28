import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import StockTable from "../components/StockTable";
import TopTraded from "../components/TopTraded";
import MarketMovers from "../components/MarketMovers";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import Hero from "../components/Hero";
import TrendSignalScanner from "../components/TrendSignalScanner";
import MarketIndexPanel from "../components/MarketIndexPanel";

const DEFAULT_SYMBOL = "VNINDEX";

export default function Dashboard() {
  const { data, error, loading } = usePolling(fetchMarketOverview, [], 30000);
  const { symbols: watchlist } = useWatchlist();
  const [chartSymbol, setChartSymbol] = useState(watchlist[0] ?? DEFAULT_SYMBOL);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <Hero />

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Biểu đồ kỹ thuật</h1>
          <Link
            to={`/backtest?symbol=${encodeURIComponent(chartSymbol)}`}
            className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
          >
            🧪 Backtest {chartSymbol}
          </Link>
        </div>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]">
          <TechnicalChartPanel
            symbol={chartSymbol}
            height={600}
            onSymbolChange={setChartSymbol}
            // /market/overview isn't behind the quote/history fallback chain
            // yet, so this is undefined today — kept so the chart already
            // picks up a source the moment that endpoint gains one too.
            preferSource={data?.quotes.find((q) => q.symbol === chartSymbol)?.source}
          />
          <div className="space-y-4">
            <MarketIndexPanel symbol={chartSymbol} />
            <TrendSignalScanner />
          </div>
        </div>
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
      {data && data.quotes.length > 0 && <StockTable quotes={data.quotes} />}
    </div>
  );
}
