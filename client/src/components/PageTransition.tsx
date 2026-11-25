import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

// Chuyển trang: một lớp phủ màu nền với logo Bull Stock ở giữa hiện lên rồi mờ đi,
// trang mới trượt nhẹ lên. Lần đầu mở web cũng hiện logo. Người bật "giảm chuyển động"
// thì bỏ qua lớp phủ.

const HOLD_MS = 420; // logo đứng giữa màn hình
const FADE_MS = 320; // lớp phủ mờ đi

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function PageTransition() {
  const { pathname } = useLocation();
  const first = useRef(true);
  const [phase, setPhase] = useState<"cover" | "fade" | "off">(reducedMotion() ? "off" : "cover");

  useEffect(() => {
    if (reducedMotion()) return;
    if (!first.current) setPhase("cover");
    first.current = false;
    const t1 = setTimeout(() => setPhase("fade"), HOLD_MS);
    const t2 = setTimeout(() => setPhase("off"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  if (phase === "off") return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-[var(--ab-bg)]"
      style={{ opacity: phase === "fade" ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
    >
      <div className="pt-logo flex flex-col items-center">
        <img src="/logo-cn-bull.png" alt="" className="h-auto w-40 sm:w-48" />
        <span className="mt-6 block h-[3px] w-40 overflow-hidden rounded-full bg-[rgba(201,162,74,0.25)]">
          <i className="pt-bar block h-full w-1/2 rounded-full bg-[var(--sm-gold)]" />
        </span>
      </div>
    </div>
  );
}
