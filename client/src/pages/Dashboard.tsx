import { useMemo } from "react";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import TopTraded from "../components/TopTraded";
import MarketMovers from "../components/MarketMovers";
import IndexTicker from "../components/IndexTicker";
import LeaderBoard from "../components/LeaderBoard";
import LeaderBoardBreadthHistory from "../components/LeaderBoardBreadthHistory";
import MarketOverviewBanner from "../components/MarketOverviewBanner";
import MarketRegimeChart from "../components/MarketRegimeChart";
import InterestRateChart from "../components/InterestRateChart";
import SpecialOffers from "../components/SpecialOffers";
import ForeignFlowChart from "../components/ForeignFlowChart";
import { computeForeignFlowRows } from "../utils/foreignFlow";

export default function Dashboard() {
  // Real-time polling: cập nhật dữ liệu thị trường mỗi 10 giây
  const { data } = usePolling(fetchMarketOverview, [], 10000);

  const foreignFlowRows = useMemo(() => computeForeignFlowRows(data?.quotes ?? []), [data]);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8">
      <div className="space-y-14">
        {/* Market Overview — first thing a visitor sees */}
        <div className="space-y-4">
          <MarketOverviewBanner />
          <MarketRegimeChart />
          <InterestRateChart />
        </div>

        {/* Leader Board */}
        <div>
          <div className="mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Xếp hạng</h2>
            <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Bảng xếp hạng thị trường</h3>
          </div>
          <LeaderBoard />
          <LeaderBoardBreadthHistory />
        </div>

        {/* Index Ticker */}
        <IndexTicker />

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
