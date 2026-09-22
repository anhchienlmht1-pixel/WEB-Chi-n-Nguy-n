const STEPS = [
  {
    step: "01",
    title: "Quét toàn thị trường",
    desc: "Hệ thống quét ~70 mã cổ phiếu mỗi giờ, tính SMA20/50, ADX(14) và Supertrend(10,3) cho từng mã.",
  },
  {
    step: "02",
    title: "Xác nhận tín hiệu Mua",
    desc: "Chỉ báo tín hiệu Mua khi cả 3 điều kiện đồng thuận: SMA20 > SMA50, ADX(14) > 25, Supertrend đang tăng.",
  },
  {
    step: "03",
    title: "Vào lệnh theo 3 lớp",
    desc: "Mua 1/3 khi có tín hiệu, thêm 2/3 khi giá +8%, thêm 3/3 khi +16% — miễn là xu hướng còn nguyên.",
  },
  {
    step: "04",
    title: "Thoát khi xu hướng gãy",
    desc: "Bán toàn bộ ngay khi SMA20 cắt xuống SMA50 hoặc Supertrend đảo chiều — ưu tiên bảo toàn vốn.",
  },
];

export default function ProcessSteps() {
  return (
    <section>
      <div className="mb-10 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Quy trình</h2>
        <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Hệ thống vận hành như thế nào</h3>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div
            key={s.step}
            className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow duration-300 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="font-mono text-2xl font-semibold text-slate-300 dark:text-slate-700">{s.step}</div>
            <h4 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{s.title}</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
