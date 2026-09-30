import { TrendingUp } from "lucide-react";

// Banner introducing the platform's trend-following system — shown at the
// top of the live Dashboard. Plain content, no data fetch: the 3-indicator
// combo and its rules are fixed (see client/src/utils/signals.ts /
// server/src/signals/trendScanner.ts), so nothing here needs to be live.
const INDICATORS = [
  { label: "SMA20 / SMA50", desc: "Xu hướng ngắn hạn vượt dài hạn" },
  { label: "ADX(14) > 25", desc: "Đủ mạnh, lọc bỏ thị trường đi ngang" },
  { label: "Supertrend(10,3)", desc: "Xác nhận xu hướng theo băng ATR" },
];

export default function TrendSystemIntro() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
        <TrendingUp className="h-3 w-3" strokeWidth={2} />
        Hệ thống giao dịch
      </span>
      <h1 className="mt-3 text-2xl font-bold text-slate-100 sm:text-3xl">Trend Following — Đi theo xu hướng</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Không đoán đỉnh, không đoán đáy. Toàn bộ tín hiệu Mua/Bán trên nền tảng này chạy theo{" "}
        <span className="font-semibold text-slate-200">3 chỉ báo kỹ thuật</span> kết hợp — chỉ vào lệnh khi xu hướng
        tăng đã được xác nhận, và thoát ngay khi xu hướng thực sự gãy.
      </p>

      {/* 3 indicators */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {INDICATORS.map((ind) => (
          <div key={ind.label} className="rounded-lg border border-slate-800 p-3">
            <div className="font-mono text-sm font-semibold text-emerald-400">{ind.label}</div>
            <div className="mt-1 text-xs text-slate-400">{ind.desc}</div>
          </div>
        ))}
      </div>

      {/* Buy vs Sell rule */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Mua — cần cả 3 điều kiện
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            SMA20 &gt; SMA50 <span className="text-slate-500">và</span> ADX(14) &gt; 25{" "}
            <span className="text-slate-500">và</span> Supertrend tăng — xác nhận chắc chắn mới vào lệnh.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            Bán — chỉ cần 1 trong 2
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            SMA20 cắt xuống SMA50 <span className="text-slate-500">hoặc</span> Supertrend đảo chiều giảm — thoát
            nhanh, ưu tiên bảo toàn vốn.
          </p>
        </div>
      </div>

      {/* Position sizing */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Quản lý vốn:</span>
        <span>Vào lệnh theo 3 lớp (pyramiding) — Mua 1/3 khi có tín hiệu, Mua 2/3 khi giá +8%, Mua 3/3 khi +16%, thoát hết khi trend gãy.</span>
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Toàn bộ tín hiệu chỉ mang tính chất minh họa hệ thống, không phải khuyến nghị đầu tư. Nhà đầu tư tự chịu trách nhiệm với quyết định của mình.
      </p>
    </div>
  );
}
