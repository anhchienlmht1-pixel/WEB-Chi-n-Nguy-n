import { Search, Compass, Handshake, Zap, type LucideIcon } from "lucide-react";

const VALUES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Search,
    title: "Minh bạch dữ liệu",
    desc: "Mọi tín hiệu Mua/Bán đều dựa trên công thức chỉ báo công khai (SMA, ADX, Supertrend) — không hộp đen, ai cũng kiểm chứng được.",
  },
  {
    icon: Compass,
    title: "Kỷ luật, không cảm tính",
    desc: "Hệ thống trend-following loại bỏ yếu tố cảm xúc khi vào/thoát lệnh — tuân thủ đúng quy tắc đã đặt ra từ đầu.",
  },
  {
    icon: Handshake,
    title: "Đồng hành thực tế",
    desc: "Có chuyên viên tư vấn đầu tư trực tiếp hỗ trợ, không chỉ là công cụ tự động — bạn luôn có người để trao đổi.",
  },
  {
    icon: Zap,
    title: "Cập nhật liên tục",
    desc: "Dữ liệu bảng giá cập nhật mỗi 10 giây, tín hiệu kỹ thuật quét lại mỗi giờ trên toàn bộ danh mục theo dõi.",
  },
];

export default function CoreValues() {
  return (
    <section>
      <div className="mb-10 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Giá trị cốt lõi</h2>
        <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Vì sao chọn Chiến Nguyễn Stock</h3>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map((v) => (
          <div
            key={v.title}
            className="rounded-xl border border-slate-200 bg-white p-6 text-center transition-shadow duration-300 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
              <v.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            </div>
            <h4 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">{v.title}</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{v.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
