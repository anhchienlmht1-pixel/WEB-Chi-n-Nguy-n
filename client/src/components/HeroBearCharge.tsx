import { useEffect, useRef } from "react";

// Hero animation on the Giới thiệu page (shown when VN-Index is down): a red neon
// bear drops in from the top right and lands roaring on the right of the hero,
// then stays on its last frame. The clip is the owner's own GIF, smoothed to
// 30 fps. Black in the clip is dropped with mix-blend "screen".
// Reduced motion: only the last frame is shown.

const MASK =
  "linear-gradient(to top, transparent 0%, #000 12%, #000 82%, transparent 100%), linear-gradient(to right, transparent 0%, #000 18%, #000 88%, transparent 100%)";

export default function HeroBearCharge({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const start = () => {
      v.style.opacity = "1";
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        v.currentTime = Math.max(0, (v.duration || 0) - 0.05);
        return;
      }
      v.currentTime = 0;
      v.play().catch(() => {});
    };
    if (v.readyState >= 4) start();
    else v.addEventListener("canplaythrough", start, { once: true });
    return () => v.removeEventListener("canplaythrough", start);
  }, []);

  return (
    <video
      ref={ref}
      aria-hidden="true"
      muted
      playsInline
      preload="auto"
      className={`pointer-events-none mix-blend-screen ${className}`}
      style={{
        opacity: 0,
        transition: "opacity 0.6s ease",
        WebkitMaskImage: MASK,
        maskImage: MASK,
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
      }}
    >
      <source src="/hero/bear-charge.webm" type="video/webm" />
      <source src="/hero/bear-charge.mp4" type="video/mp4" />
    </video>
  );
}
