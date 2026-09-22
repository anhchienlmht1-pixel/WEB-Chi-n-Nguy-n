import { Link } from "react-router-dom";
import { LineChart, Globe, Wallet, Trophy, Scale, Newspaper, ArrowRight, type LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; desc: string; to: string }[] = [
  {
    icon: LineChart,
    title: "Biểu đồ & tín hiệu Mua/Bán",
    desc: "Biểu đồ kỹ thuật đầy đủ công cụ vẽ, 27 chỉ báo, và tín hiệu Mua/Bán tự động theo hệ thống trend-following.",
    to: "/thi-truong",
  },
  {
    icon: Globe,
    title: "Dòng tiền khối ngoại",
    desc: "Theo dõi mua/bán ròng của nhà đầu tư nước ngoài theo từng mã cổ phiếu, cập nhật theo phiên.",
    to: "/thi-truong",
  },
  {
    icon: Wallet,
    title: "Insight quỹ mở",
    desc: "Danh mục nắm giữ của các quỹ mở (nguồn Fmarket) đối chiếu với sức mạnh giá — biết tiền lớn đang ở đâu.",
    to: "/thi-truong",
  },
  {
    icon: Trophy,
    title: "Bảng xếp hạng sức mạnh",
    desc: "Xếp hạng cổ phiếu theo ngành dựa trên sức mạnh giá tương đối — tìm mã dẫn dắt trong từng nhóm ngành.",
    to: "/thi-truong",
  },
  {
    icon: Scale,
    title: "So sánh định giá P/B",
    desc: "So sánh P/B theo thời gian cho nhóm ngân hàng, chứng khoán, bất động sản để nhận diện vùng định giá.",
    to: "/so-sanh-pb",
  },
  {
    icon: Newspaper,
    title: "Bản tin thị trường",
    desc: "Bản tin tổng hợp mỗi ngày: cổ phiếu nổi bật, ngành dẫn dắt, thanh khoản đột biến — đọc nhanh trong 1 phút.",
    to: "/ban-tin",
  },
];

export default function FeatureCards() {
  return (
    <section>
      <div className="mb-10 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tính năng</h2>
        <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Mọi công cụ bạn cần, một nơi duy nhất</h3>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.title}
            to={f.to}
            className="group rounded-xl border border-slate-200 bg-white p-6 transition-shadow duration-300 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
              <f.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            </div>
            <h4 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">{f.title}</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Xem thêm
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
