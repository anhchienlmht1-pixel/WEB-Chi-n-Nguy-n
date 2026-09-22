import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "📊",
    title: "Biểu đồ & tín hiệu Mua/Bán",
    desc: "Biểu đồ kỹ thuật đầy đủ công cụ vẽ, 27 chỉ báo, và tín hiệu Mua/Bán tự động theo hệ thống trend-following.",
    to: "/thi-truong",
  },
  {
    icon: "🌐",
    title: "Dòng tiền khối ngoại",
    desc: "Theo dõi mua/bán ròng của nhà đầu tư nước ngoài theo từng mã cổ phiếu, cập nhật theo phiên.",
    to: "/thi-truong",
  },
  {
    icon: "💰",
    title: "Insight quỹ mở",
    desc: "Danh mục nắm giữ của các quỹ mở (nguồn Fmarket) đối chiếu với sức mạnh giá — biết tiền lớn đang ở đâu.",
    to: "/thi-truong",
  },
  {
    icon: "🏆",
    title: "Bảng xếp hạng sức mạnh",
    desc: "Xếp hạng cổ phiếu theo ngành dựa trên sức mạnh giá tương đối — tìm mã dẫn dắt trong từng nhóm ngành.",
    to: "/thi-truong",
  },
  {
    icon: "⚖️",
    title: "So sánh định giá P/B",
    desc: "So sánh P/B theo thời gian cho nhóm ngân hàng, chứng khoán, bất động sản để nhận diện vùng định giá.",
    to: "/so-sanh-pb",
  },
  {
    icon: "📰",
    title: "Bản tin thị trường",
    desc: "Bản tin tổng hợp mỗi ngày: cổ phiếu nổi bật, ngành dẫn dắt, thanh khoản đột biến — đọc nhanh trong 1 phút.",
    to: "/ban-tin",
  },
];

export default function FeatureCards() {
  return (
    <section className="mb-12">
      <div className="mb-6 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tính năng</h2>
        <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Mọi công cụ bạn cần, một nơi duy nhất</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.title}
            to={f.to}
            className="group rounded-lg border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-emerald-700"
          >
            <div className="text-2xl">{f.icon}</div>
            <h4 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{f.title}</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
            <span className="mt-3 inline-block text-xs font-semibold text-emerald-600 group-hover:underline dark:text-emerald-400">
              Xem thêm →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
