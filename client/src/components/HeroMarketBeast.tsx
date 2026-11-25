import { useEffect, useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { fetchQuote } from "../api/client";
import { useLivePoll } from "../hooks/useMarketClock";
import Flash from "./Flash";
import HeroBullCharge from "./HeroBullCharge";
import HeroBearCharge from "./HeroBearCharge";

// The hero animal follows VN-Index in real time: green (up) → the bull, red
// (down) → the bear. VN-Index is re-read every 30 seconds; when the market
// flips colour the other animal plays its run and then stays on its last frame.
// A flat reading (exactly 0) keeps whichever animal is showing, so the page
// doesn't flicker on a tie. Nothing is drawn until VN-Index is known — if it
// can't be read, no animal is shown rather than a guess.

const POLL_MS = 30 * 1000;
type Kind = "bull" | "bear";

export default function HeroMarketBeast() {
  const { data: q } = usePolling(() => fetchQuote("VNINDEX"), [], useLivePoll(POLL_MS));
  const [kind, setKind] = useState<Kind | null>(null);

  useEffect(() => {
    if (!q) return;
    // Colour = today's level against the reference (yesterday's close); fall
    // back to the change fields only when the reference is missing.
    const ch = q.prevClose > 0 && q.price > 0 ? q.price - q.prevClose : (q.change ?? q.changePercent ?? 0);
    if (ch > 0) setKind("bull");
    else if (ch < 0) setKind("bear");
    else setKind((k) => k ?? "bull");
  }, [q]);

  if (!kind) return null;

  const up = kind === "bull";
  const pct = q ? Math.abs(q.changePercent).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const level = q ? q.price.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  return (
    <>
      {/* key = kind: a change of colour mounts the other animal, which plays its run. */}
      {up ? (
        <HeroBullCharge key="bull" className="absolute bottom-0 left-0 hidden aspect-square h-full lg:block" />
      ) : (
        <HeroBearCharge
          key="bear"
          className="absolute right-0 bottom-0 hidden aspect-[1100/612] w-[62%] max-w-[1100px] lg:block"
        />
      )}
      {q && (
        <p
          aria-live="polite"
          className="absolute top-6 right-6 z-[2] hidden items-center gap-2 rounded-full border border-[var(--ab-line)] bg-[var(--ab-card)] px-3.5 py-1.5 text-[0.8rem] text-[var(--ab-text)] lg:flex"
        >
          <span
            aria-hidden="true"
            className="hero-pulse inline-block h-2 w-2 rounded-full"
            style={{ background: up ? "var(--ab-up)" : "var(--ab-down)" }}
          />
          VN-Index{" "}
          <Flash value={q.price}>
            <b className="tabular-nums text-[var(--ab-strong)]">{level}</b>
          </Flash>
          <b className="tabular-nums" style={{ color: up ? "var(--ab-up)" : "var(--ab-down)" }}>
            {up ? "▲" : "▼"} {pct}%
          </b>
          <span className="text-[var(--ab-muted)]">· {up ? "thị trường xanh" : "thị trường đỏ"}</span>
        </p>
      )}
    </>
  );
}
