import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useWatchlist } from "../hooks/useWatchlist";
import TechnicalChartPanel from "../components/TechnicalChartPanel";
import { SonMaiHero, SonMaiHoldings, SonMaiJournal, SonMaiKpis, useSignalData } from "../components/SonMaiHome";

const DEFAULT_SYMBOL = "VNINDEX";

const H2 = "text-[1.75rem] leading-tight";

// Trang chủ, bố cục Sơn mài: mở đầu (chữ + thẻ Chốt phiên), dải hiệu suất,
// danh mục đang giữ cạnh nhật ký đóng lệnh, biểu đồ của mã đang chọn (giữ
// nguyên biểu đồ cũ), rồi người phụ trách, cách chọn mã và mở tài khoản.
export default function TrendSignals() {
  const { data } = usePolling(fetchMarketOverview, [], 10000);
  const { symbols: watchlist } = useWatchlist();
  const [chartSymbol, setChartSymbol] = useState(watchlist[0] ?? DEFAULT_SYMBOL);
  const { scan, journal } = useSignalData();
  const chartRef = useRef<HTMLElement>(null);

  // VNINDEX không có điểm Mua/Bán: khi có danh mục thì mặc định mở mã đầu tiên.
  useEffect(() => {
    if (watchlist.length > 0 || chartSymbol !== DEFAULT_SYMBOL) return;
    const first = scan?.items[0]?.symbol;
    if (first) setChartSymbol(first);
  }, [scan, watchlist, chartSymbol]);

  const pick = (s: string) => {
    setChartSymbol(s);
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div id="tin-hieu" className="gutter-x mx-auto max-w-[1280px] scroll-mt-20 pb-16">
      <SonMaiHero scan={scan} journal={journal} />

      <div className="mt-12">
        <SonMaiKpis journal={journal} />
      </div>

      <div className="mt-16 grid gap-x-6 gap-y-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <SonMaiHoldings scan={scan} onPick={pick} />
        </div>
        <div className="min-w-0 lg:col-span-4">
          <SonMaiJournal journal={journal} />
        </div>
      </div>

      <section ref={chartRef} aria-label="Biểu đồ" className="mt-16 scroll-mt-28">
        <h2 className={`${H2} mb-4`}>Biểu đồ {chartSymbol}</h2>
        <TechnicalChartPanel
          symbol={chartSymbol}
          height={480}
          onSymbolChange={setChartSymbol}
          preferSource={data?.quotes.find((q) => q.symbol === chartSymbol)?.source}
          hideStats
          hideDrawingTools
        />
      </section>

      <div className="mt-16 flex flex-wrap items-start gap-x-12 gap-y-8 border-t border-[var(--sm-line)] pt-12">
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
            Mỗi ngày sau 15:00, hệ thống tự lọc ra những mã đang đi lên rõ ràng. Anh chị không cần ngồi dò hàng trăm mã.
          </p>
          <ul className="mt-2 max-w-2xl border-t border-slate-200 text-base text-slate-800">
            <li className="border-b border-slate-200 py-2">
              <b className="text-slate-950">Chỉ chọn mã đang lên đều,</b> không chọn mã chỉ nhích lên một hôm.
            </li>
            <li className="border-b border-slate-200 py-2">
              <b className="text-slate-950">Chỉ chọn khi đà đủ mạnh,</b> bỏ qua mã đi ngang lình xình.
            </li>
            <li className="border-b border-slate-200 py-2">
              <b className="text-slate-950">Xu hướng gãy thì mã tự rời danh sách,</b> nhắc anh chị cân nhắc thoát, không ôm hàng.
            </li>
          </ul>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Dựa trên đường trung bình giá, độ mạnh xu hướng và Supertrend, tính trên giá đóng cửa. Danh sách không đổi
            trong phiên. Chỉ để tham khảo, quyết định mua bán là của nhà đầu tư.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] px-8 py-7">
        <div className="min-w-0 flex-[1_1_26rem]">
          <h2 className={H2}>Mở tài khoản chứng khoán tại KAFI</h2>
          <p className="mt-1 max-w-xl text-base text-slate-900">
            Mở miễn phí, không phí duy trì. Có video hướng dẫn từng bước; cần hỗ trợ thì nhắn Zalo cho anh Chiến.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to="/huong-dan-mo-tai-khoan"
            className="sm-btn sm-btn-p"
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
    </div>
  );
}
