import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import CoreValues from "../components/CoreValues";
import FeatureCards from "../components/FeatureCards";
import StatsBand from "../components/StatsBand";
import ProcessSteps from "../components/ProcessSteps";
import CaseStudySection from "../components/CaseStudySection";
import Reveal from "../components/Reveal";

export default function Landing() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:py-10">
      <div className="space-y-20 sm:space-y-24">
        <Hero />

        <Reveal>
          <CoreValues />
        </Reveal>

        <Reveal>
          <FeatureCards />
        </Reveal>

        <Reveal>
          <StatsBand />
        </Reveal>

        <Reveal>
          <ProcessSteps />
        </Reveal>

        <Reveal>
          <CaseStudySection />
        </Reveal>

        {/* Final CTA */}
        <Reveal>
          <section className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900/40 sm:px-10">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sẵn sàng đầu tư có hệ thống?</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500 dark:text-slate-400">
              Vào thẳng bảng giá thời gian thực, xem tín hiệu Mua/Bán đang chạy, hoặc liên hệ để được tư vấn mở tài khoản.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/thi-truong"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-emerald-700"
              >
                Vào hệ thống ngay
              </Link>
              <Link
                to="/huong-dan-mo-tai-khoan"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors duration-300 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hướng dẫn mở tài khoản
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
