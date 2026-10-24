import { useEffect, useMemo, useState } from "react";
import { fetchHistory, fetchTrendBuySignals, fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import TrendSignalScanner from "../components/TrendSignalScanner";
import TrendSystemStats from "../components/TrendSystemStats";
import TrendJournal from "../components/TrendJournal";
import TrendSystemIntro from "../components/TrendSystemIntro";
import { aggregatePoints } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";

const DEFAULT_SYMBOL = "VNINDEX";

// Homepage — chart + whole-market buy-signal scanner + trade journal.
// The site is intentionally minimal: one page whose whole job is
// showing Mua/Bán signals and getting a visitor to open an account,
// not a market-data portal (overview banner, Leader Board, movers,
// news... were all cut).
export default function TrendSignals() {
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
    return result.transitions;
  }, [historyState.data]);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8">
      <div className="space-y-14">
        {/* Main Chart + Signals Section */}
        <div>
          <div className="mb-5">
            <h1 className="text-[28px] font-extrabold leading-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Tín hiệu Mua/Bán theo xu hướng
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Đang xem {chartSymbol} — quét Trend Following trên toàn thị trường, cập nhật liên tục.
            </p>
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
      </div>
    </div>
  );
}
