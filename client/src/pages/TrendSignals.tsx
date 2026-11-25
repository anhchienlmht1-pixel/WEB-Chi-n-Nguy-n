import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useWatchlist } from "../hooks/useWatchlist";
import KLinePanel from "../components/KLinePanel";
import { SonMaiKpis, dmy, useMarketTrend, useSignalData } from "../components/SonMaiHome";
import SignalSidePanel from "../components/SignalSidePanel";
import { MethodSteps, SectionHead } from "../components/HomeSections";

const DEFAULT_SYMBOL = "VNINDEX";

// Trang Tín hiệu — trang công cụ, đi thẳng vào số liệu:
//  1. Tiêu đề + trạng thái phiên (chốt ngày nào, thị trường đang thế nào)
//  2. Dải hiệu suất
//  3. Danh mục đang giữ | nhật ký đóng lệnh
//  4. Biểu đồ nến của mã đang chọn (bấm mã trong danh mục để đổi)
//  5. Phương pháp + liên hệ ngắn
export default function TrendSignals() {
  const { symbols: watchlist } = useWatchlist();
  const [chartSymbol, setChartSymbol] = useState(watchlist[0] ?? DEFAULT_SYMBOL);
  const { scan, journal } = useSignalData();
  const { trend, trendCls, trendSub } = useMarketTrend();
  const chartRef = useRef<HTMLElement>(null);

  // VNINDEX không có điểm Mua/Bán: khi có danh mục thì mặc định mở mã đầu tiên.
  useEffect(() => {
    if (watchlist.length > 0 || chartSymbol !== DEFAULT_SYMBOL) return;
    const first = scan?.items[0]?.symbol;
    if (first) setChartSymbol(first);
  }, [scan, watchlist, chartSymbol]);

  const pick = (s: string) => {
    setChartSymbol(s);
    // trên điện thoại cột phải nằm dưới biểu đồ: cuộn lên cho thấy biểu đồ vừa đổi
    if (window.innerWidth < 1024) chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const held = scan?.items.length ?? null;
  const fresh = scan ? scan.items.filter((i) => i.buyDate.slice(0, 10) === scan.sessionDate.slice(0, 10)).length : null;

  return (
    <div id="tin-hieu" className="scroll-mt-20 text-[var(--sm-egg)]">
      {/* 1. Tiêu đề + trạng thái */}
      <header className="border-b border-[var(--sm-line)] bg-[var(--sm-panel)]">
        <div className="gutter-x mx-auto flex max-w-[1920px] flex-wrap items-end justify-between gap-x-10 gap-y-5 py-8">
          <div className="max-w-[42rem]">
            <h1 className="text-[clamp(2rem,3.6vw,2.8rem)] leading-tight text-[var(--sm-egg)]">Tín hiệu xu hướng</h1>
            <p className="mt-2 text-[1.05rem] leading-relaxed text-[var(--sm-egg2)]">
              Danh sách mã đang đi lên theo hệ thống của chuyên viên Nguyễn Anh Chiến, chốt sau 15:00 mỗi ngày giao dịch, kèm nhật ký lệnh công khai.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-x-8 gap-y-2 text-[0.9rem]">
            <div>
              <dt className="text-[var(--sm-mut)]">Chốt phiên</dt>
              <dd className="mt-0.5 font-display text-[1.35rem] leading-tight text-[var(--sm-egg)]">{scan ? dmy(scan.sessionDate) : "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--sm-mut)]">Đang giữ · mua mới</dt>
              <dd className="mt-0.5 font-display text-[1.35rem] leading-tight text-[var(--sm-egg)]">
                {held ?? "—"} · <span className="up">{fresh ?? "—"}</span>
              </dd>
            </div>
            <div title={trendSub}>
              <dt className="text-[var(--sm-mut)]">VN-Index</dt>
              <dd className={`mt-0.5 font-display text-[1.35rem] leading-tight ${trendCls || "text-[var(--sm-egg)]"}`}>{trend}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="gutter-x mx-auto max-w-[1920px] pb-20">
        {/* 2. Hiệu suất */}
        <section aria-label="Hiệu suất hệ thống" className="pt-8">
          <SonMaiKpis journal={journal} />
        </section>

        {/* 3. Biểu đồ | Danh mục, nhật ký, sổ lệnh */}
        <section ref={chartRef} id="danh-muc" aria-label="Biểu đồ và danh mục" className="mt-10 scroll-mt-28">
          <span id="nhat-ky" className="block scroll-mt-28" aria-hidden="true" />
          <div className="grid items-stretch gap-4 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-2 lg:col-span-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[1.5rem] leading-tight text-[var(--sm-egg)]">Biểu đồ {chartSymbol}</h2>
                <Link to={`/stock/${chartSymbol}`} className="text-[0.92rem] font-semibold text-[var(--sm-gold2)] hover:underline">
                  Mở trang {chartSymbol}
                </Link>
              </div>
              <div className="min-h-0 flex-1">
                <KLinePanel symbol={chartSymbol} height={560} fill />
              </div>
              <p className="text-[0.8rem] text-[var(--sm-mut)]">Tam giác xanh là điểm mua, đỏ là điểm đóng lệnh của hệ thống. Bấm mã ở cột phải để đổi biểu đồ.</p>
            </div>
            <div className="min-w-0 lg:col-span-4">
              <SignalSidePanel scan={scan} journal={journal} symbol={chartSymbol} onPick={pick} />
            </div>
          </div>
        </section>

        {/* 5. Phương pháp */}
        <section aria-label="Phương pháp" className="mt-16">
          <SectionHead title="Hệ thống chọn mã thế nào" id="phuong-phap" />
          <MethodSteps />
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-md border border-[rgba(201,162,74,0.45)] bg-[var(--sm-panel)] px-6 py-6 sm:px-8">
          <div className="min-w-0 flex-[1_1_26rem]">
            <h2 className="text-[1.5rem] leading-tight text-[var(--sm-egg)]">Cần hỏi về một mã trong danh sách?</h2>
            <p className="mt-1 max-w-xl text-[1rem] text-[var(--sm-egg2)]">
              Nhắn Zalo cho anh Chiến (0886.284.212), hoặc mở tài khoản KAFI với mã giới thiệu CHIEN005 để được hỗ trợ trực tiếp.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="https://zalo.me/0886284212" target="_blank" rel="noopener noreferrer" className="sm-btn sm-btn-p">
              Nhắn Zalo
            </a>
            <Link to="/huong-dan-mo-tai-khoan" className="sm-btn">
              Mở tài khoản
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
