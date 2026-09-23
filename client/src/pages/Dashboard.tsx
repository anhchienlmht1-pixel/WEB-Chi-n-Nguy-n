import { useEffect, useMemo, useState } from "react";
import { fetchHistory, fetchTrendBuySignals } from "../api/client";
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
import TrendJournal from "../components/TrendJournal";
import TrendSystemIntro from "../components/TrendSystemIntro";
import ForeignFlowChart from "../components/ForeignFlowChart";
import { aggregatePoints } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";
import { computeForeignFlowRows } from "../utils/foreignFlow";

const DEFAULT_SYMBOL = "VNINDEX";

export default function Dashboard() {
  // Real-time polling: cập nhật dữ liệu thị trường mỗi 10 giây
  const { data } = usePolling(fetchMarketOverview, [], 10000);
  const { symbols: watchlist } = useWatchlist();
  const [chartSymbol, setChartSymbol] = useState(watchlist[0] ?? DEFAULT_SYMBOL);

  // VNINDEX never carries a Mua/Bán marker, so the very first chart a
  // visitor sees would show no signal at all — once the buy-signal scan
  // comes back, swap the default over to the first stock actually on a
  // live signal (but only if nobody's picked/kept their own symbol yet).
  const buySignalsState = usePolling(() => fetchTrendBuySignals(), [], 5 * 60 * 1000);
  useEffect(() => {
    if (watchlist.length > 0 || chartSymbol !== DEFAULT_SYMBOL) return;
    const first = buySignalsState.data?.[0]?.symbol;
    if (first) setChartSymbol(first);
  }, [buySignalsState.data, watchlist, chartSymbol]);

  // Fetch history for signal computation
  const historyState = usePolling(() => fetchHistory(chartSymbol, "MAX"), [chartSymbol], 5000);

  // Compute trading signals
  const signals = useMemo(() => {
    if (!historyState.data) return [];
    const chartPoints = aggregatePoints(historyState.data.points, "D");
    const result = computeTradingSignals(chartPoints);
    return result.all;
  }, [historyState.data]);

  const foreignFlowRows = useMemo(() => computeForeignFlowRows(data?.quotes ?? []), [data]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <div className="space-y-14">
        {/* Leader Board — first thing a visitor sees */}
        <div>
          <div className="mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Xếp hạng</h2>
            <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Bảng xếp hạng thị trường</h3>
          </div>
          <LeaderBoard />
        </div>

        {/* Index Ticker */}
        <IndexTicker />

        {/* Main Chart + Signals Section */}
        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Phân tích kỹ thuật</h2>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Biểu đồ thị trường</h1>
            </div>
          </div>
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

        {/* Trend System Intro — right under the chart */}
        <TrendSystemIntro />

        {/* Trend System Statistics */}
        {chartSymbol !== "VNINDEX" && <TrendSystemStats signals={signals} symbol={chartSymbol} />}

        {/* Trade journal — real, forward-only "lịch sử giao dịch" */}
        <TrendJournal />

        {/* Market Data Bottom Row */}
        <div>
          <div className="mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Thị trường</h2>
            <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Hoạt động thị trường</h3>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopTraded />
            {data && data.quotes.length > 0 && <MarketMovers quotes={data.quotes} />}
          </div>
          {foreignFlowRows.length > 0 && (
            <div className="mt-6">
              <ForeignFlowChart rows={foreignFlowRows} />
            </div>
          )}
        </div>

        {/* Special Offers */}
        <SpecialOffers />
      </div>
    </div>
  );
}
