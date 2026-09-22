import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import CoreValues from "../components/CoreValues";
import FeatureCards from "../components/FeatureCards";
import StatsBand from "../components/StatsBand";
import ProcessSteps from "../components/ProcessSteps";
import CaseStudySection from "../components/CaseStudySection";

export default function Landing() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <Hero />
      <CoreValues />
      <FeatureCards />
      <StatsBand />
      <ProcessSteps />
      <CaseStudySection />

      {/* Final CTA */}
      <section className="mb-12 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center dark:border-emerald-900/40 dark:bg-emerald-500/5 sm:px-10">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sẵn sàng đầu tư có hệ thống?</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-400">
          Vào thẳng bảng giá thời gian thực, xem tín hiệu Mua/Bán đang chạy, hoặc liên hệ để được tư vấn mở tài khoản.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/thi-truong"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Vào hệ thống ngay →
          </Link>
          <Link
            to="/huong-dan-mo-tai-khoan"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-6 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          >
            Hướng dẫn mở tài khoản
          </Link>
        </div>
      </section>
    </div>
  );
}
