import { Link } from "react-router-dom";
import { fetchMarketOverview } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import HeroSignals from "../components/HeroSignals";
import PriceBoard from "../components/PriceBoardBg";
import { SonMaiKpis, useSignalData } from "../components/SonMaiHome";
import { AdvisorAndAccount, MethodSteps, ProductGrid, SectionHead } from "../components/HomeSections";

// Trang Giới thiệu (trang chủ) — bố cục trang giới thiệu sản phẩm:
//  1. Mở đầu: thông điệp + 2 nút hành động, bên phải là "hôm nay" (chỉ số + phiên vừa chốt)
//  2. Kết quả công khai: dải hiệu suất từ nhật ký lệnh thật
//  3. Bull Stock có gì: các mảng dữ liệu, mỗi thẻ kèm số liệu sống
//  4. Phương pháp: 3 bước
//  5. Người phụ trách + mở tài khoản
export default function About() {
  const { data } = usePolling(fetchMarketOverview, [], 10000);
  const { scan, journal } = useSignalData();

  return (
    <div className="text-[var(--sm-egg)]">
      {/* 1. Mở đầu trên nền bảng điện */}
      <section className="relative overflow-hidden">
        <PriceBoard />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(var(--ab-bg-rgb),0.97) 0%, rgba(var(--ab-bg-rgb),0.9) 45%, rgba(var(--ab-bg-rgb),0.7) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{ background: "linear-gradient(180deg, rgba(var(--ab-bg-rgb),0) 0%, var(--ab-bg) 100%)" }}
        />
        <div className="gutter-x relative z-[1] mx-auto grid max-w-[1280px] items-center gap-x-12 gap-y-10 pt-12 pb-16 lg:grid-cols-12 lg:pt-20 lg:pb-20">
          <div className="lg:col-span-6">
            <h1 className="text-[clamp(2.3rem,4.8vw,3.8rem)] leading-[1.08] text-[var(--sm-egg)]">Đầu tư theo xu hướng, có kỷ luật và minh bạch.</h1>
            <div className="my-6 h-px w-24 bg-[var(--sm-gold)]" />
            <p className="max-w-[34rem] text-[1.15rem] leading-relaxed text-[var(--sm-egg2)]">
              Bull Stock lọc mã đang đi lên sau mỗi phiên, ghi lại từng lệnh mua bán kèm lãi lỗ thật, và tổng hợp dữ liệu ngành ngân hàng, chứng khoán để anh chị tự
              đánh giá.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/tin-hieu" className="sm-btn sm-btn-p">
                Xem tín hiệu hôm nay
              </Link>
              <Link to="/huong-dan-mo-tai-khoan" className="sm-btn">
                Mở tài khoản KAFI
              </Link>
            </div>
            <p className="mt-7 text-[0.92rem] text-[var(--sm-egg2)]">
              <b className="text-[var(--sm-egg)]">Nguyễn Anh Chiến</b> · Chuyên viên tư vấn đầu tư, Chứng khoán KAFI
            </p>
          </div>
          <div className="min-w-0 lg:col-span-6">
            <HeroSignals />
          </div>
        </div>
      </section>

      <div className="gutter-x mx-auto max-w-[1280px] pb-20">
        {/* 2. Kết quả công khai */}
        <section aria-label="Kết quả công khai" className="pt-6">
          <SectionHead
            title="Kết quả công khai"
            lead="Mọi lệnh của hệ thống đều được ghi lại từ ngày bắt đầu, không chỉnh sửa về sau: lệnh thắng, lệnh thua, thời gian giữ."
            right={
              <Link to="/tin-hieu#nhat-ky" className="text-[0.95rem] font-semibold text-[var(--sm-gold2)] hover:underline">
                Xem nhật ký lệnh
              </Link>
            }
          />
          <SonMaiKpis journal={journal} />
        </section>

        {/* 3. Bull Stock có gì */}
        <section aria-label="Bull Stock có gì" className="pt-16">
          <SectionHead title="Bull Stock có gì" lead="Mỗi mục kèm số liệu mới nhất. Bấm để xem chi tiết." />
          <ProductGrid quotes={data?.quotes} scan={scan} journal={journal} />
        </section>

        {/* 4. Phương pháp */}
        <section aria-label="Phương pháp" className="pt-16">
          <SectionHead title="Hệ thống chọn mã thế nào" lead="Một quy trình cố định, chạy giống nhau cho mọi mã, không phụ thuộc cảm xúc." />
          <MethodSteps />
        </section>

        {/* 5. Người phụ trách + mở tài khoản */}
        <section aria-label="Liên hệ" className="pt-16">
          <SectionHead title="Người phụ trách và mở tài khoản" />
          <AdvisorAndAccount />
        </section>
      </div>
    </div>
  );
}
