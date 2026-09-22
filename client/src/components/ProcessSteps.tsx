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
    <section className="mb-12">
      <div className="mb-6 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Quy trình</h2>
        <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Hệ thống vận hành như thế nào</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.step} className="relative rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="font-mono text-3xl font-bold text-emerald-500/30">{s.step}</div>
            <h4 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{s.title}</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
            {i < STEPS.length - 1 && (
              <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-300 lg:block dark:text-slate-700">→</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
