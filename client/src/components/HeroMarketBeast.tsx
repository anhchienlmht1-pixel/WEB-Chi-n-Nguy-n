import { useState, useEffect } from "react";
import { fetchQuote } from "../api/client";
import HeroBullCharge from "./HeroBullCharge";
import HeroBearCharge from "./HeroBearCharge";

// Picks the hero animal from the market: VN-Index down on the day → the red
// bear, otherwise the green bull. Decided once when the page opens, so the
// animal doesn't swap mid-animation; nothing is drawn until VN-Index is known.
export default function HeroMarketBeast() {
  const [kind, setKind] = useState<"bull" | "bear" | null>(null);

  useEffect(() => {
    let dead = false;
    fetchQuote("VNINDEX")
      .then((q) => {
        if (!dead) setKind((q?.changePercent ?? 0) < 0 ? "bear" : "bull");
      })
      .catch(() => {
        if (!dead) setKind("bull");
      });
    return () => {
      dead = true;
    };
  }, []);

  if (kind === "bear")
    return <HeroBearCharge className="absolute right-0 bottom-0 hidden aspect-[1100/612] w-[62%] max-w-[1100px] lg:block" />;
  if (kind === "bull")
    return <HeroBullCharge className="absolute bottom-0 left-0 hidden aspect-square h-full lg:block" />;
  return null;
}
