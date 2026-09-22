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
import FundInsight from "../components/FundInsight";
import TrendSignalScanner from "../components/TrendSignalScanner";
import SpecialOffers from "../components/SpecialOffers";
import TrendSystemStats from "../components/TrendSystemStats";
import TrendClosedTrades from "../components/TrendClosedTrades";
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
        {/* Trend System Intro — first thing a visitor sees */}
        <TrendSystemIntro />

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

        {/* Trend System Statistics */}
        {chartSymbol !== "VNINDEX" && <TrendSystemStats signals={signals} symbol={chartSymbol} />}

        {/* Closed trend-following trades — "lịch sử các deal đã đóng" */}
        <TrendClosedTrades />

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

        {/* Fund Insight — dòng tiền quỹ mở (nguồn Fmarket) */}
        <div>
          <div className="mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Dòng tiền quỹ</h2>
            <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Insight từ các quỹ mở</h3>
          </div>
          <FundInsight />
        </div>

        <div>
          <div className="mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Xếp hạng</h2>
            <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Bảng xếp hạng thị trường</h3>
          </div>
          <LeaderBoard />
        </div>

        {/* Special Offers */}
        <SpecialOffers />
      </div>
    </div>
  );
}
