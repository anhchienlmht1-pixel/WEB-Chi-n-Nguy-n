import { useEffect, useMemo, useState } from "react";
import { fetchHistory, fetchTrendBuyResult, fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import TrendSignalScanner from "../components/TrendSignalScanner";
import TrendSystemStats from "../components/TrendSystemStats";
import TrendJournal from "../components/TrendJournal";
import TrendSystemIntro from "../components/TrendSystemIntro";
import HomeHero from "../components/HomeHero";
import { aggregatePoints } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";
import { dropUnclosedBars } from "../utils/sessionClose";

const DEFAULT_SYMBOL = "VNINDEX";

// Homepage — editorial hero, then chart + whole-market buy-signal scanner,
// the system intro and the trade journal.
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
  const buySignalsState = usePolling(() => fetchTrendBuyResult(), [], 5 * 60 * 1000);
  useEffect(() => {
    if (watchlist.length > 0 || chartSymbol !== DEFAULT_SYMBOL) return;
    const first = buySignalsState.data?.items[0]?.symbol;
    if (first) setChartSymbol(first);
  }, [buySignalsState.data, watchlist, chartSymbol]);

  // Fetch history for signal computation
  const historyState = usePolling(() => fetchHistory(chartSymbol, "MAX"), [chartSymbol], 30000);

  // Compute trading signals
  const signals = useMemo(() => {
    if (!historyState.data) return [];
    // Closed sessions only — see utils/sessionClose.ts.
    const chartPoints = aggregatePoints(dropUnclosedBars(historyState.data.points), "D");
    const result = computeTradingSignals(chartPoints);
    return result.transitions;
  }, [historyState.data]);

  return (
    <>
      <HomeHero />

      {/* Chart + whole-market buy-signal list, straight under the hero. */}
      <section id="tin-hieu" className="scroll-mt-16 bg-mid py-14 sm:py-20">
        <div className="gutter-x mx-auto max-w-[1800px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em]">
                Tín hiệu Mua/Bán theo xu hướng
              </p>
              <h2 className="editorial text-[clamp(32px,4.6vw,64px)] uppercase leading-[1.02]">
                Xu hướng. Kỷ luật. Tín hiệu.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-[1.7]">
              Đang xem {chartSymbol} — quét Trend Following trên toàn thị trường, chốt tín hiệu sau mỗi phiên đóng cửa.
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
      </section>

      <div className="gutter-x mx-auto max-w-[1800px] space-y-10 py-14 sm:py-20">
        {/* Trend System Intro */}
        <div id="he-thong" className="scroll-mt-20">
          <TrendSystemIntro />
        </div>

        {/* Trend System Statistics */}
        {chartSymbol !== "VNINDEX" && <TrendSystemStats signals={signals} symbol={chartSymbol} />}

        {/* Trade journal — real, forward-only "lịch sử giao dịch" */}
        <div id="nhat-ky" className="scroll-mt-20">
          <TrendJournal />
        </div>
      </div>
    </>
  );
}
