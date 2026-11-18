import { useEffect, useRef, useState } from "react";

// Số chạy mượt từ giá trị cũ sang giá trị mới (~0,7 giây), như bảng điện tử.
export default function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || !Number.isFinite(start)) {
      from.current = value;
      setShown(value);
      return;
    }
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      const e = 1 - (1 - k) ** 3;
      const v = start + (value - start) * e;
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}
