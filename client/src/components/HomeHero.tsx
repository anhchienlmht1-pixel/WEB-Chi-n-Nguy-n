import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const ICON = {
  width: 28,
  height: 28,
  viewBox: "0 0 28 28",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: (
      <svg {...ICON}>
        <circle cx="14" cy="14" r="11" />
        <circle cx="14" cy="14" r="5.5" />
        <path d="M14 14 L23 6" />
      </svg>
    ),
    title: "Quét toàn thị trường",
    desc: "Tự động rà soát hơn 70 mã trên nến ngày đã đóng cửa theo hệ thống Trend Following.",
  },
  {
    icon: (
      <svg {...ICON}>
        <circle cx="14" cy="14" r="11" />
        <path d="M14 8 V14 L18.5 16.5" />
      </svg>
    ),
    title: "Chốt sau mỗi phiên",
    desc: "Tín hiệu Mua/Bán chỉ kết luận sau 15:00, không nhảy số trong phiên.",
  },
  {
    icon: (
      <svg {...ICON}>
        <path d="M3 22 L10 13 L15 17.5 L24 6" />
        <path d="M18 6 H24 V12" />
      </svg>
    ),
    title: "Điểm vào rõ ràng",
    desc: "Ngày vào tín hiệu, thời gian nắm giữ và lãi/lỗ hiện tại của từng mã.",
  },
  {
    icon: (
      <svg {...ICON}>
        <path d="M14 3 L23 6.5 V13.5 C23 19 19.5 22.5 14 25 C8.5 22.5 5 19 5 13.5 V6.5 Z" />
        <path d="M10 14 L13 17 L18.5 11" />
      </svg>
    ),
    title: "Mở tài khoản miễn phí",
    desc: "Không phí duy trì, được hỗ trợ trực tiếp bởi chuyên viên tư vấn.",
  },
];

// Homepage hero: the promise on the left (one orange button), the four reasons
// to trust the tool as soft teal cards on the right. No intro animation.
export default function HomeHero() {
  return (
    <section className="border-b border-slate-200">
      <div className="gutter-x mx-auto flex max-w-[1280px] flex-wrap items-center gap-12 py-16">
        <div className="min-w-0 flex-[1_1_26rem]">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-emerald-700">
            Trend Following · Chốt sổ sau 15:00
          </p>
          <h1 className="text-balance text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-tight">
            Tín hiệu mua bán rõ ràng, mở tài khoản là giao dịch ngay
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-900">
            Hệ thống Trend Following rà soát cả thị trường sau mỗi phiên và cho bạn thấy mã nào đang vào xu hướng tăng.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link
              to="/huong-dan-mo-tai-khoan"
              className="inline-flex min-h-13 items-center justify-center rounded-md bg-orange-600 px-7 text-lg font-bold text-slate-950 transition-colors duration-200 hover:bg-orange-500"
            >
              Mở tài khoản
            </Link>
            <Link
              to={{ pathname: "/", hash: "#tin-hieu" }}
              className="inline-flex min-h-11 items-center gap-2 border-b-2 border-emerald-700 text-lg font-bold text-emerald-700 transition-opacity duration-200 hover:opacity-80"
            >
              Xem tín hiệu chốt phiên
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-8 text-base text-slate-600">Tín hiệu rõ ràng. Kỷ luật là lợi thế. Quyết định là của bạn.</p>
        </div>

        <ul className="grid min-w-0 flex-[1_1_26rem] grid-cols-[repeat(auto-fit,minmax(min(14rem,100%),1fr))] gap-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex flex-col gap-3 rounded-md bg-emerald-50 p-6">
              <span className="text-emerald-700">{f.icon}</span>
              <h3 className="text-xl font-bold leading-snug text-emerald-700">{f.title}</h3>
              <p className="text-base leading-normal text-slate-900">{f.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
