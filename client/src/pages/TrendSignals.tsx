import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchHistory, fetchTrendBuyResult, fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import ChartSwitcher from "../components/ChartSwitcher";
import TrendSignalScanner from "../components/TrendSignalScanner";
import TrendSystemStats from "../components/TrendSystemStats";
import HomeHero from "../components/HomeHero";
import { aggregatePoints } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";
import { dropUnclosedBars } from "../utils/sessionClose";

const DEFAULT_SYMBOL = "VNINDEX";

// Homepage — hero, then chart + whole-market buy-signal scanner + stats.
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

      {/* Chart + whole-market buy-signal list + the system's stats. */}
      <section id="tin-hieu" className="gutter-x mx-auto max-w-[1280px] scroll-mt-20 py-16">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-tight">Tín hiệu chốt phiên</h2>
          <p className="text-base text-slate-600">Cập nhật sau 15:00 · Đang xem {chartSymbol}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="min-w-0">
            <ChartSwitcher
              symbol={chartSymbol}
              height={500}
              onSymbolChange={setChartSymbol}
              preferSource={data?.quotes.find((q) => q.symbol === chartSymbol)?.source}
              hideStats
            />
          </div>

          {/* From lg up the list is stretched to exactly the chart column's
              height (absolute fill, so the list itself never makes the row
              taller than the chart) and scrolls inside; below lg the columns
              stack and it gets a fixed height. */}
          <div className="relative h-[32rem] lg:h-auto">
            <div className="h-full lg:absolute lg:inset-0">
              <TrendSignalScanner onSelectSymbol={setChartSymbol} fill />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <TrendSystemStats signals={signals} symbol={chartSymbol} />
        </div>
      </section>

      <section className="gutter-x mx-auto max-w-[1280px] pb-16">
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-6 rounded-md bg-emerald-50 p-[clamp(1.5rem,4vw,2.5rem)]">
          <div className="min-w-0 flex-[1_1_26rem]">
            <h2 className="text-balance text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-tight">
              Mở tài khoản miễn phí, có chuyên viên hỗ trợ trực tiếp
            </h2>
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-900">
              Không phí duy trì. Xem video hướng dẫn hoặc nhắn Zalo cho chuyên viên tư vấn để được mở tài khoản nhanh.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/huong-dan-mo-tai-khoan"
              className="inline-flex min-h-13 items-center justify-center rounded-md bg-orange-600 px-7 text-lg font-bold text-slate-950 transition-colors duration-200 hover:bg-orange-500"
            >
              Mở tài khoản
            </Link>
            <a
              href="https://zalo.me/0886284212"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-13 items-center justify-center rounded-md border-2 border-emerald-700 px-6 text-lg font-bold text-emerald-700 transition-colors duration-200 hover:bg-white"
            >
              Tư vấn qua Zalo
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
