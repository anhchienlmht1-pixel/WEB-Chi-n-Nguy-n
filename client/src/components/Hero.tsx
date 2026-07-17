const STATS = [
  { value: "64+", label: "Mã cổ phiếu & chỉ số" },
  { value: "27", label: "Chỉ báo kỹ thuật" },
  { value: "Thời gian thực", label: "Cập nhật liên tục" },
];

export default function Hero() {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-6 py-12 sm:px-10 sm:py-16">
      {/* Warm glow accents — no external assets, just layered radial gradients. */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
      />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          Theo dõi. Phân tích. Đầu tư.
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
          Nền tảng đầu tư chứng khoán{" "}
          <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            toàn diện
          </span>{" "}
          của bạn
        </h1>
        <p className="mt-4 max-w-xl text-sm text-slate-400 sm:text-base">
          Chiến Nguyễn Invest mang đến bảng giá thời gian thực, biểu đồ kỹ thuật chuyên
          sâu với đầy đủ công cụ vẽ và thư viện chỉ báo, cùng dữ liệu tài chính doanh
          nghiệp — tất cả trong một nơi duy nhất.
        </p>

        <div className="mt-8 flex flex-wrap gap-8 sm:gap-12">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-orange-400 sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-slate-400 sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
