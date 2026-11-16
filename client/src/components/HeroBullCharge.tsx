import { useEffect, useRef } from "react";

// Hero animation on the Giới thiệu page: a neon bull charges up the candle chart
// and butts the tallest candle. The clip (the owner's own GIF, smoothed to 30 fps)
// plays once and holds its last frame; hovering it plays it again. Black in the
// clip is dropped with mix-blend "screen" so it sits on the dark hero.
// Reduced motion: only the final frame is shown.

// Soft oval fade so the clip has no visible edge on the hero.
const MASK = "radial-gradient(ellipse 50% 50% at 50% 50%, #000 70%, transparent 100%)";

export default function HeroBullCharge({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().catch(() => {});
  }, []);

  const replay = () => {
    const v = ref.current;
    if (!v || !v.ended) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  return (
    <video
      ref={ref}
      muted
      playsInline
      preload="auto"
      poster="/hero/bull-charge-end.jpg"
      aria-hidden="true"
      onMouseEnter={replay}
      className={`mix-blend-screen ${className}`}
      style={{ WebkitMaskImage: MASK, maskImage: MASK }}
    >
      <source src="/hero/bull-charge.webm" type="video/webm" />
      <source src="/hero/bull-charge.mp4" type="video/mp4" />
    </video>
  );
}
