import { TrendingUp } from "lucide-react";

// Banner introducing the platform's trend-following system — shown right
// under the chart on the "Tín hiệu" page. A black editorial panel (same
// "band" colour as the header strip and the signal list), square corners.
// Plain content, no data fetch: the 3-indicator combo and its rules are
// fixed (see client/src/utils/signals.ts / server/src/signals/
// trendScanner.ts), so nothing here needs to be live.
const INDICATORS = ["SMA20 / SMA50", "ADX(14) > 25", "Supertrend(10,3)"];

export default function TrendSystemIntro() {
  return (
    <div className="bg-band p-5 text-white sm:p-8">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2fb39a]">
        <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
        Hệ thống giao dịch
      </span>
      <h2 className="mt-3 editorial text-2xl uppercase leading-[1.1] sm:text-4xl">
        Trend Following — Đi theo xu hướng
      </h2>

      <p className="mt-4 max-w-3xl text-sm leading-[1.75] text-quiet-on-band">
        Không đoán đỉnh, không đoán đáy — chỉ vào lệnh khi{" "}
        <span className="font-semibold text-white">{INDICATORS.join(" · ")}</span> cùng xác nhận xu hướng tăng, thoát
        ngay khi xu hướng thực sự gãy.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-px bg-white/10 text-[13px] leading-relaxed sm:grid-cols-2">
        <p className="bg-band py-1 text-quiet-on-band sm:pr-6">
          <span className="font-semibold text-[#2fb39a]">Mua (cần cả 3):</span> SMA20 &gt; SMA50{" "}
          <span className="opacity-60">và</span> ADX(14) &gt; 25 <span className="opacity-60">và</span> Supertrend
          tăng.
        </p>
        <p className="bg-band py-1 text-quiet-on-band sm:pl-6">
          <span className="font-semibold text-red-400">Bán (chỉ cần 1):</span> SMA20 cắt xuống SMA50{" "}
          <span className="opacity-60">hoặc</span> Supertrend đảo chiều giảm.
        </p>
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-quiet-on-band">
        <span className="font-semibold text-white">Quản lý vốn:</span> vào lệnh 3 lớp (pyramiding) — Mua 1/3 khi có
        tín hiệu, 2/3 khi giá +8%, 3/3 khi +16%, đóng deal khi trend gãy.
      </p>

      <p className="mt-4 text-[11px] text-quiet-on-band/70">
        Toàn bộ tín hiệu chỉ mang tính chất minh họa hệ thống, không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
