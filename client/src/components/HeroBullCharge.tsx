import { useEffect, useRef } from "react";

// Hero animation on the Giới thiệu page: a neon bull rises out of the dark in the
// bottom-left corner of the hero and charges up and across to the right side.
// The clip (the owner's own GIF, smoothed to 30 fps) starts with the bull in its
// own bottom-left corner; while it plays, the whole clip travels from the left
// edge of the hero to the right, so the bull crosses the hero. It plays once and
// holds the last frame on the right; hovering the bull plays it again.
// Black in the clip is dropped with mix-blend "screen" so it sits on the dark hero.
// Reduced motion: the final frame is shown on the right, no movement.

// Soft edges on all four sides (wider on top and right) so the clip has no visible box.
const MASK =
  "linear-gradient(to top, transparent 0%, #000 10%, #000 76%, transparent 100%), linear-gradient(to right, transparent 0%, #000 14%, #000 80%, transparent 100%)";
const EASE = "cubic-bezier(0.55, 0, 0.35, 1)";

export default function HeroBullCharge({ className = "" }: { className?: string }) {
  const box = useRef<HTMLVideoElement | null>(null);
  const vid = useRef<HTMLVideoElement | null>(null);
  const anim = useRef<Animation | null>(null);

  // How far the clip travels: from the left edge to the right edge of the hero.
  const travel = () => {
    const b = box.current;
    const parent = b?.parentElement;
    if (!b || !parent) return 0;
    return Math.max(0, parent.clientWidth - b.offsetWidth);
  };

  const run = () => {
    const b = box.current;
    const v = vid.current;
    if (!b || !v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const end = `translateX(${travel()}px)`;
    anim.current?.cancel();
    if (reduce) {
      b.style.transform = end;
      if (v.readyState >= 1) v.currentTime = v.duration || 0;
      return;
    }
    const dur = (Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 3.5) * 1000;
    b.style.transform = "";
    v.currentTime = 0;
    anim.current = b.animate([{ transform: "translateX(0)" }, { transform: end }], {
      duration: dur,
      easing: EASE,
      fill: "forwards",
    });
    v.play().catch(() => {});
  };

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    const start = () => run();
    if (v.readyState >= 1) start();
    else v.addEventListener("loadedmetadata", start, { once: true });
    // Keep the resting position on the right when the window is resized.
    const onResize = () => {
      if (!v.ended && !v.paused) return;
      anim.current?.cancel();
      if (box.current) box.current.style.transform = `translateX(${travel()}px)`;
    };
    window.addEventListener("resize", onResize);
    return () => {
      v.removeEventListener("loadedmetadata", start);
      window.removeEventListener("resize", onResize);
      anim.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <video
        ref={(el) => {
          vid.current = el;
          box.current = el;
        }}
        aria-hidden="true"
        muted
        playsInline
        preload="auto"
        onMouseEnter={() => {
          if (vid.current?.ended) run();
        }}
        className={`pointer-events-auto mix-blend-screen ${className}`}
        style={{ WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskComposite: "source-in", maskComposite: "intersect" }}
      >
        <source src="/hero/bull-charge.webm" type="video/webm" />
        <source src="/hero/bull-charge.mp4" type="video/mp4" />
      </video>
  );
}
