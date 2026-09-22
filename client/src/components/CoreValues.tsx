const VALUES = [
  {
    icon: "🔍",
    title: "Minh bạch dữ liệu",
    desc: "Mọi tín hiệu Mua/Bán đều dựa trên công thức chỉ báo công khai (SMA, ADX, Supertrend) — không hộp đen, ai cũng kiểm chứng được.",
  },
  {
    icon: "🧭",
    title: "Kỷ luật, không cảm tính",
    desc: "Hệ thống trend-following loại bỏ yếu tố cảm xúc khi vào/thoát lệnh — tuân thủ đúng quy tắc đã đặt ra từ đầu.",
  },
  {
    icon: "🤝",
    title: "Đồng hành thực tế",
    desc: "Có chuyên viên tư vấn đầu tư trực tiếp hỗ trợ, không chỉ là công cụ tự động — bạn luôn có người để trao đổi.",
  },
  {
    icon: "⚡",
    title: "Cập nhật liên tục",
    desc: "Dữ liệu bảng giá cập nhật mỗi 10 giây, tín hiệu kỹ thuật quét lại mỗi giờ trên toàn bộ danh mục theo dõi.",
  },
];

export default function CoreValues() {
  return (
    <section className="mb-12">
      <div className="mb-6 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Giá trị cốt lõi</h2>
        <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Vì sao chọn Chiến Nguyễn Stock</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map((v) => (
          <div
            key={v.title}
            className="rounded-lg border border-slate-200 bg-white p-5 text-center transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl dark:bg-emerald-500/10">
              {v.icon}
            </div>
            <h4 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{v.title}</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{v.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
