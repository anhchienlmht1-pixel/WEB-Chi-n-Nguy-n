import { useMemo, useState } from "react";
import { fetchHistory } from "../api/client";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import TopTraded from "../components/TopTraded";
import MarketMovers from "../components/MarketMovers";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import IndexTicker from "../components/IndexTicker";
import LeaderBoard from "../components/LeaderBoard";
import TrendSignalScanner from "../components/TrendSignalScanner";
import SpecialOffers from "../components/SpecialOffers";
import TrendSystemStats from "../components/TrendSystemStats";
import { aggregatePoints } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";

const DEFAULT_SYMBOL = "VNINDEX";

export default function Dashboard() {
  // Real-time polling: cập nhật dữ liệu thị trường mỗi 10 giây
  const { data } = usePolling(fetchMarketOverview, [], 10000);
  const { symbols: watchlist } = useWatchlist();
  const [chartSymbol, setChartSymbol] = useState(watchlist[0] ?? DEFAULT_SYMBOL);

  // Fetch history for signal computation
  const historyState = usePolling(() => fetchHistory(chartSymbol, "MAX"), [chartSymbol], 5000);

  // Compute trading signals
  const signals = useMemo(() => {
    if (!historyState.data) return [];
    const chartPoints = aggregatePoints(historyState.data.points, "D");
    const result = computeTradingSignals(chartPoints);
    return result.all;
  }, [historyState.data]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {/* Index Ticker */}
      <IndexTicker />

      {/* Main Chart + Signals Section */}
      <div className="mb-6">
        <h1 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Biểu đồ Kỹ Thuật</h1>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Chart */}
          <div className="min-w-0">
            <TechnicalChartPanel
              symbol={chartSymbol}
              height={420}
              onSymbolChange={setChartSymbol}
              preferSource={data?.quotes.find((q) => q.symbol === chartSymbol)?.source}
            />
          </div>

          {/* Trend Signals */}
          <div className="w-full">
            <TrendSignalScanner onSelectSymbol={setChartSymbol} />
          </div>
        </div>
      </div>

      {/* Trend System Statistics */}
      {chartSymbol !== "VNINDEX" && (
        <div className="mb-6">
          <TrendSystemStats signals={signals} symbol={chartSymbol} />
        </div>
      )}

      {/* Market Data Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopTraded />
        {data && data.quotes.length > 0 && <MarketMovers quotes={data.quotes} />}
      </div>

      <div className="mt-6">
        <LeaderBoard />
      </div>

      {/* Special Offers - Compact version at the bottom */}
      <div className="mt-12 mb-8">
        <SpecialOffers />
      </div>
    </div>
  );
}
