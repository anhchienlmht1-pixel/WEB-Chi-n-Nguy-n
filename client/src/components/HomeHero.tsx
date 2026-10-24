import { Link } from "react-router-dom";
import { Radar, Clock3, ShieldCheck, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: Radar,
    title: "Quét toàn thị trường",
    desc: "Tự động rà soát hơn 70 mã mỗi giờ theo hệ thống Trend Following.",
  },
  {
    icon: Clock3,
    title: "Cập nhật liên tục",
    desc: "Tín hiệu Mua/Bán và nhật ký giao dịch làm mới theo thời gian thực.",
  },
  {
    icon: ShieldCheck,
    title: "Mở tài khoản miễn phí",
    desc: "Không phí duy trì, được hỗ trợ trực tiếp bởi chuyên viên tư vấn.",
  },
];

// Homepage hero — brand headline + CTA band above the functional
// chart/scanner, with a 3-card value-prop row underneath it.
export default function HomeHero() {
  return (
    <section className="overflow-hidden rounded-md bg-emerald-700 dark:bg-emerald-900">
      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Chiến Nguyễn Stock</p>
        <h2 className="mt-2 max-w-xl text-2xl font-extrabold leading-tight text-white sm:text-3xl">
          Tín hiệu mua bán rõ ràng, mở tài khoản là giao dịch ngay
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-emerald-100">
          Hệ thống quét Trend Following trên toàn thị trường, báo điểm vào/ra cụ thể cho từng mã — giúp bạn ra quyết
          định mua bán nhanh mà không cần tự phân tích kỹ thuật.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/huong-dan-mo-tai-khoan"
            className="inline-flex items-center gap-1.5 rounded bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-lg"
          >
            Mở tài khoản ngay
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
          <a
            href="#tin-hieu"
            className="inline-flex items-center gap-1.5 rounded border border-emerald-400/50 px-5 py-2.5 text-sm font-semibold text-emerald-50 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600/40 hover:shadow-lg"
          >
            Xem tín hiệu hôm nay
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-emerald-600/40 dark:bg-emerald-950/60 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="relative bg-emerald-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:z-10 dark:bg-slate-900"
          >
            <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" strokeWidth={1.75} />
            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
