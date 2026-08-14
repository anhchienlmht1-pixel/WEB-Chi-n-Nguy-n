import { useState } from "react";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import TopTraded from "../components/TopTraded";
import MarketMovers from "../components/MarketMovers";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import Hero from "../components/Hero";
import TrendSignalScanner from "../components/TrendSignalScanner";
import IndexTicker from "../components/IndexTicker";

const DEFAULT_SYMBOL = "VNINDEX";

export default function Dashboard() {
  const { data } = usePolling(fetchMarketOverview, [], 30000);
  const { symbols: watchlist } = useWatchlist();
  const [chartSymbol, setChartSymbol] = useState(watchlist[0] ?? DEFAULT_SYMBOL);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <Hero />

      <IndexTicker />

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

      {/* "TOP 10 CỔ PHIẾU" / "Diễn biến thị trường" side by side on wide
          screens; each already scrolls its own table horizontally if it
          needs more room than its column gets. Stacks to a single column
          below lg. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <TopTraded />

        {data && data.quotes.length > 0 && <MarketMovers quotes={data.quotes} />}
      </div>
    </div>
  );
}
