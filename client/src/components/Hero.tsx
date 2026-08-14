const STATS = [
  { value: "64+", label: "Mã cổ phiếu & chỉ số" },
  { value: "27", label: "Chỉ báo kỹ thuật" },
  { value: "Thời gian thực", label: "Cập nhật liên tục" },
];

// City-skyline silhouette + an uptrend candlestick line, drawn by hand as
// SVG paths (no photo asset) — a stand-in for the "ảnh bìa tài chính
// chứng khoán" request: a financial-district skyline at dusk with a
// standout central tower, evoking the same mood as a Landmark 81 sunset
// shot without depending on any external image the sandbox can fetch.
// Positioned right-of-text so it never fights with the headline on the left.
const BUILDINGS = [
  { x: 560, w: 46, h: 90 },
  { x: 612, w: 34, h: 130 },
  { x: 652, w: 58, h: 70 },
  { x: 716, w: 40, h: 150 },
  { x: 762, w: 30, h: 100 },
  { x: 940, w: 44, h: 110 },
  { x: 990, w: 34, h: 75 },
  { x: 1030, w: 50, h: 135 },
  { x: 1086, w: 32, h: 95 },
  { x: 1124, w: 46, h: 60 },
];

const CANDLES = [
  { x: 830, o: 210, c: 190, h: 218, l: 184 },
  { x: 848, o: 190, c: 200, h: 205, l: 184 },
  { x: 866, o: 200, c: 170, h: 204, l: 165 },
  { x: 884, o: 170, c: 178, h: 182, l: 162 },
  { x: 902, o: 178, c: 140, h: 182, l: 135 },
];

function SkylineArt() {
  return (
    <svg
      viewBox="0 0 1200 300"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="hero-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Warm backlight behind the tallest tower — same sunset-behind-the-
          landmark-tower feel as the reference photo. */}
      <ellipse cx="900" cy="230" rx="240" ry="150" fill="#f59e0b" opacity="0.16" />

      {BUILDINGS.map((b) => (
        <rect key={b.x} x={b.x} y={300 - b.h} width={b.w} height={b.h} fill="url(#hero-sky)" stroke="#475569" strokeWidth="1" />
      ))}
      {/* The standout central tower, with a thin antenna spire on top. */}
      <rect x="864" y="55" width="28" height="245" fill="url(#hero-tower)" stroke="#64748b" strokeWidth="1.5" />
      <line x1="878" y1="55" x2="878" y2="24" stroke="#94a3b8" strokeWidth="2" />

      {/* Upward candlestick trend, floating above the skyline. */}
      {CANDLES.map((c) => (
        <g key={c.x} stroke="#34d399" strokeWidth="1.5">
          <line x1={c.x + 5} y1={c.h} x2={c.x + 5} y2={c.l} />
          <rect
            x={c.x}
            y={Math.min(c.o, c.c)}
            width="10"
            height={Math.max(2, Math.abs(c.o - c.c))}
            fill={c.c <= c.o ? "#34d399" : "#0f172a"}
          />
        </g>
      ))}
    </svg>
  );
}

export default function Hero() {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-6 py-12 sm:px-10 sm:py-16">
      {/* Warm glow accents — no external assets, just layered radial gradients. */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
      />
      <SkylineArt />
      {/* Left-side fade so the skyline never competes with the headline's
          contrast, even on narrow viewports where it scales up under the text. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(90deg, #020617 0%, #020617 38%, transparent 72%)" }}
      />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Theo dõi. Phân tích. Đầu tư.
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
          Nền tảng đầu tư chứng khoán{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            toàn diện
          </span>{" "}
          của bạn
        </h1>
        <p className="mt-4 max-w-xl text-sm text-slate-400 sm:text-base">
          Chiến Nguyễn Invest mang đến bảng giá thời gian thực, biểu đồ kỹ thuật chuyên
          sâu với đầy đủ công cụ vẽ và thư viện chỉ báo, cùng dữ liệu tài chính doanh
          nghiệp — tất cả trong một nơi duy nhất.
        </p>

        <a
          href="https://www.youtube.com/watch?v=CyUYSWOAavw"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          ▶️ Hướng dẫn mở tài khoản chứng khoán
        </a>

        <div className="mt-8 flex flex-wrap gap-8 sm:gap-12">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-emerald-400 sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-slate-400 sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
