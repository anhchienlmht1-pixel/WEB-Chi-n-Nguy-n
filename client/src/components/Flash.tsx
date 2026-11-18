import { useEffect, useRef, useState, type ReactNode } from "react";

type FlashCls = "" | "flash-up" | "flash-down";

// Nháy nền xanh khi số tăng, đỏ khi số giảm (như bảng điện), rồi tắt dần.
export function useFlash(value: number | null | undefined): FlashCls {
  const prev = useRef<number | null | undefined>(value);
  const [cls, setCls] = useState<FlashCls>("");
  useEffect(() => {
    const p = prev.current;
    prev.current = value;
    if (p == null || value == null || !Number.isFinite(p) || !Number.isFinite(value) || p === value) return;
    const dir: FlashCls = value > p ? "flash-up" : "flash-down";
    // Clear first so the same direction twice in a row restarts the animation.
    setCls("");
    const raf = requestAnimationFrame(() => setCls(dir));
    const id = setTimeout(() => setCls(""), 1300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(id);
    };
  }, [value]);
  return cls;
}

export default function Flash({
  value,
  children,
  className = "",
}: {
  value: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const cls = useFlash(value);
  return <span className={`flash-box px-0.5 ${cls} ${className}`}>{children}</span>;
}
