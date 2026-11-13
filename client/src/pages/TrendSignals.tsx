import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchHistory, fetchTrendBuyResult, fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import TrendSignalScanner from "../components/TrendSignalScanner";
import TrendSystemStats from "../components/TrendSystemStats";
import { aggregatePoints } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";
import { dropUnclosedBars } from "../utils/sessionClose";

const DEFAULT_SYMBOL = "VNINDEX";

// "2026-11-09" -> "09/11/2026"
function longDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

// "2026-11-03" -> "03/11"
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${d}/${m}` : iso;
}

const H2 = "text-xl font-bold leading-snug";

// Homepage. No hero: the first thing on the page is the day's result — one
// sentence of facts, then the chart and the list of stocks on a buy signal,
// the system's closed-trade stats, who is behind it, how stocks are picked,
// and one box about opening an account. The site is intentionally minimal: its
// whole job is showing Mua/Bán signals and getting a visitor to open an account.
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

  // The day's result in one sentence, from the same list the table shows.
  const summary = useMemo(() => {
    const result = buySignalsState.data;
    if (!result) return null;
    const items = result.items;
    const losing = items.filter((i) => i.signalReturnPercent < 0).length;
    const latest = items.reduce<(typeof items)[number] | null>(
      (best, i) => (!best || i.buyDate > best.buyDate ? i : best),
      null
    );
    return { total: items.length, losing, latest, sessionDate: result.sessionDate };
  }, [buySignalsState.data]);

  let sentence: string;
  if (!summary) {
    sentence = buySignalsState.error
      ? "Chưa tải được danh sách tín hiệu. Vui lòng thử lại sau giây lát."
      : "Đang quét thị trường để tìm cổ phiếu đang trong xu hướng tăng…";
  } else if (summary.total === 0) {
    sentence = "Hiện chưa có mã nào hội đủ điều kiện MUA. Danh sách chốt sau 15:00 mỗi phiên.";
  } else {
    sentence =
      `${summary.total} mã đang giữ tín hiệu MUA` +
      (summary.losing > 0 ? `, trong đó ${summary.losing} mã đang lỗ` : "") +
      "." +
      (summary.latest ? ` Mã vào gần nhất là ${summary.latest.symbol} (${shortDate(summary.latest.buyDate)}).` : "") +
      " Danh sách chốt sau 15:00 mỗi phiên.";
  }

  return (
    <section id="tin-hieu" className="gutter-x mx-auto max-w-[1600px] scroll-mt-20 pb-10 pt-7">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-bold leading-tight">
            {summary ? `Tín hiệu MUA sau phiên ${longDate(summary.sessionDate)}` : "Tín hiệu MUA"}
          </h1>
          <p className="mt-1.5 text-base text-slate-900">{sentence}</p>
        </div>
        <p className="text-sm text-slate-500">Đang xem {chartSymbol}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0">
          <TechnicalChartPanel
            symbol={chartSymbol}
            height={480}
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

      <div className="mt-8">
        <TrendSystemStats signals={signals} symbol={chartSymbol} />
      </div>

      <div className="mt-8 flex flex-wrap items-start gap-x-12 gap-y-8">
        <div className="min-w-0 flex-[1_1_22rem]">
          <h2 className={H2}>Nguyễn Anh Chiến</h2>
          <p className="mt-0.5 text-base text-slate-900">Chuyên viên tư vấn đầu tư, CTCP Chứng khoán KAFI</p>
          <p className="mt-2.5 text-base">
            <a href="tel:0886284212" className="inline-flex min-h-11 items-center font-bold text-brand-700 hover:underline">
              0886.284.212
            </a>
            <span className="text-slate-500"> · Zalo cùng số</span>
          </p>
        </div>

        <div className="min-w-0 flex-[1.3_1_28rem]">
          <h2 className={H2}>Hệ thống chọn mã thế nào</h2>
          <p className="mt-2 max-w-2xl text-base text-slate-900">
            Một mã vào danh sách MUA khi cả ba điều kiện cùng đúng trên nến ngày đã đóng cửa:
          </p>
          <ol className="mt-2 max-w-2xl list-decimal space-y-0.5 pl-5 text-base text-slate-900">
            <li>đường trung bình 20 phiên (SMA20) nằm trên đường 50 phiên (SMA50);</li>
            <li>chỉ báo sức mạnh xu hướng ADX(14) lớn hơn 25;</li>
            <li>Supertrend(10,3) đang báo xu hướng tăng.</li>
          </ol>
          <p className="mt-2 max-w-2xl text-base text-slate-900">
            Kết luận chỉ chốt sau 15:00, nên danh sách không đổi trong phiên. Đây là công cụ tham khảo, quyết định mua
            bán là của nhà đầu tư.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-md border border-slate-200 px-6 py-5">
        <div className="min-w-0 flex-[1_1_26rem]">
          <h2 className={H2}>Mở tài khoản chứng khoán tại KAFI</h2>
          <p className="mt-1 max-w-xl text-base text-slate-900">
            Mở miễn phí, không phí duy trì. Có video hướng dẫn từng bước; cần hỗ trợ thì nhắn Zalo cho anh Chiến.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to="/huong-dan-mo-tai-khoan"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-orange-600 px-5 text-base font-bold text-slate-950 transition-colors duration-200 hover:bg-orange-500"
          >
            Mở tài khoản
          </Link>
          <a
            href="https://zalo.me/0886284212"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center border-b border-brand-700 text-base font-bold text-brand-700 hover:opacity-80"
          >
            Nhắn Zalo
          </a>
        </div>
      </div>
    </section>
  );
}
