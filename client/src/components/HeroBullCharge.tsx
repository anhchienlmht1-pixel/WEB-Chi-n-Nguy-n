import { useEffect, useRef } from "react";

// Hero animation on the Giới thiệu page (shown when VN-Index is up): a neon bull
// rises out of the dark on the right of the hero, leaps a short way up and to
// the right, and stays on its last frame.
// The clip is the owner's own GIF, smoothed to 30 fps. Black in the clip is
// dropped with mix-blend "screen" so it sits on the dark hero.
// Reduced motion: only the last frame is shown, in its resting place.

// Soft edges on all four sides (wider on top and right) so the clip has no visible box.
const MASK =
  "linear-gradient(to top, transparent 0%, #000 10%, #000 76%, transparent 100%), linear-gradient(to right, transparent 0%, #000 14%, #000 90%, transparent 100%)";

export default function HeroBullCharge({ className = "" }: { className?: string }) {
  const box = useRef<HTMLVideoElement | null>(null);
  const vid = useRef<HTMLVideoElement | null>(null);
  const raf = useRef(0);

  // How far the clip travels: from the left edge to the right edge of the hero.
  const travel = () => {
    const b = box.current;
    const parent = b?.parentElement;
    if (!b || !parent) return 0;
    return Math.max(0, parent.clientWidth - b.offsetWidth - 24);
  };

  // The bull only moves while it actually leaps in the clip (about 50%–88% of
  // it): before that it rises out of the dark in place, so it never skates.
  // It covers a short diagonal — up and to the right — and lands softly.
  const LEAP_FROM = 0.5;
  const LEAP_TO = 0.88;
  const SHORT = 0.32; // share of the full left→right distance covered by the leap
  const RISE = 70; // px it climbs during the leap
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const pose = (p: number) => {
    const full = travel();
    const k = easeOut(Math.min(1, Math.max(0, (p - LEAP_FROM) / (LEAP_TO - LEAP_FROM))));
    const x = full * (1 - SHORT) + full * SHORT * k;
    const y = RISE * (1 - k);
    return `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  };

  // The travel is driven by the clip's own clock, so the bull's position always
  // matches the frame on screen, even if the video stalls while loading.
  const follow = () => {
    const b = box.current;
    const v = vid.current;
    if (!b || !v) return;
    const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 1;
    const p = Math.min(1, v.currentTime / d);
    b.style.transform = pose(p);
    if (!v.paused && !v.ended) raf.current = requestAnimationFrame(follow);
  };

  const run = () => {
    const b = box.current;
    const v = vid.current;
    if (!b || !v) return;
    cancelAnimationFrame(raf.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.currentTime = Math.max(0, (v.duration || 0) - 0.05);
      b.style.transform = pose(1);
      b.style.opacity = "1";
      return;
    }
    v.currentTime = 0;
    b.style.transform = pose(0);
    b.style.opacity = "1";
    v.play()
      .then(() => {
        raf.current = requestAnimationFrame(follow);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    const start = () => run();
    // Wait until the whole clip can play without stopping.
    if (v.readyState >= 4) start();
    else v.addEventListener("canplaythrough", start, { once: true });
    return () => {
      v.removeEventListener("canplaythrough", start);
      cancelAnimationFrame(raf.current);
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
        className={`pointer-events-none mix-blend-screen will-change-transform ${className}`}
        style={{
          opacity: 0,
          transition: "opacity 0.9s ease",
          WebkitMaskImage: MASK,
          maskImage: MASK,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      >
        <source src="/hero/bull-charge.webm" type="video/webm" />
        <source src="/hero/bull-charge.mp4" type="video/mp4" />
      </video>
  );
}
