import { Link } from "react-router-dom";
import HeroSignals from "../components/HeroSignals";
import PriceBoard from "../components/PriceBoardBg";
import { useSignalData } from "../components/SonMaiHome";
import { AdvisorAndAccount, HomePillars, MethodSteps, SectionHead } from "../components/HomeSections";

// Trang Giới thiệu (trang chủ) — bố cục trang giới thiệu sản phẩm:
//  1. Mở đầu: thông điệp + 2 nút hành động, bên phải là "hôm nay" (chỉ số + phiên vừa chốt)
//  2. Dữ liệu → Sóng ngành → Tín hiệu: mỗi mảng một dòng insight và 4 thẻ số liệu sống
//  4. Phương pháp: 3 bước
//  5. Người phụ trách + mở tài khoản
export default function About() {
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
        <div className="gutter-x relative z-[1] mx-auto grid max-w-[1920px] items-center gap-x-12 gap-y-10 pt-12 pb-16 lg:grid-cols-12 lg:pt-20 lg:pb-20">
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

      <div className="gutter-x mx-auto max-w-[1920px] pb-20">
        {/* 2. Dữ liệu → Sóng ngành → Tín hiệu, mỗi mảng kèm insight sống */}
        <div className="pt-6">
          <HomePillars scan={scan} journal={journal} />
        </div>

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
