import { TrendingUp } from "lucide-react";

// Banner introducing the platform's trend-following system — shown right
// under the chart on the "Tín hiệu" page, as a compact footnote rather
// than a hero section (it's background context, not the main content).
// Plain content, no data fetch: the 3-indicator combo and its rules are
// fixed (see client/src/utils/signals.ts / server/src/signals/
// trendScanner.ts), so nothing here needs to be live.
const INDICATORS = ["SMA20 / SMA50", "ADX(14) > 25", "Supertrend(10,3)"];

export default function TrendSystemIntro() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
          <TrendingUp className="h-3 w-3" strokeWidth={2} />
          Hệ thống giao dịch
        </span>
        <h2 className="text-sm font-bold text-slate-100">Trend Following — Đi theo xu hướng</h2>
      </div>

      <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-400">
        Không đoán đỉnh, không đoán đáy — chỉ vào lệnh khi{" "}
        <span className="font-semibold text-slate-200">{INDICATORS.join(" · ")}</span> cùng xác nhận xu hướng tăng,
        thoát ngay khi xu hướng thực sự gãy.
      </p>

      <div className="mt-2 grid grid-cols-1 gap-2 text-xs leading-relaxed sm:grid-cols-2">
        <p className="text-slate-400">
          <span className="font-semibold text-emerald-400">Mua (cần cả 3):</span> SMA20 &gt; SMA50{" "}
          <span className="text-slate-500">và</span> ADX(14) &gt; 25 <span className="text-slate-500">và</span>{" "}
          Supertrend tăng.
        </p>
        <p className="text-slate-400">
          <span className="font-semibold text-red-400">Bán (chỉ cần 1):</span> SMA20 cắt xuống SMA50{" "}
          <span className="text-slate-500">hoặc</span> Supertrend đảo chiều giảm.
        </p>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Quản lý vốn:</span> vào lệnh 3 lớp (pyramiding) — Mua 1/3 khi
        có tín hiệu, 2/3 khi giá +8%, 3/3 khi +16%, đóng deal khi trend gãy.
      </p>

      <p className="mt-2 text-[10px] text-slate-500">
        Toàn bộ tín hiệu chỉ mang tính chất minh họa hệ thống, không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
