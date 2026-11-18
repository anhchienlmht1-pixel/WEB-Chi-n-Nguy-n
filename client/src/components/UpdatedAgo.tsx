import { useMarketClock } from "../hooks/useMarketClock";

// "Cập nhật 12 giây trước" — đếm lên từng giây, đèn xanh nhấp nháy khi đang trong phiên.
export default function UpdatedAgo({ at, className = "" }: { at: number | null; className?: string }) {
  const { now, live } = useMarketClock();
  if (!at) return null;
  const s = Math.max(0, Math.round((now - at) / 1000));
  const txt = s < 60 ? `${s} giây trước` : s < 3600 ? `${Math.floor(s / 60)} phút trước` : `${Math.floor(s / 3600)} giờ trước`;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-[var(--ab-muted)] ${className}`}>
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${live ? "hero-pulse" : ""}`}
        style={{ background: live ? "var(--ab-up)" : "var(--ab-muted)" }}
      />
      Cập nhật {txt}
    </span>
  );
}
