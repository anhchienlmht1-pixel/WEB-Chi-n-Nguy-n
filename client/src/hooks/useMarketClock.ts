import { useEffect, useState } from "react";
import { marketSession, type SessionInfo } from "../lib/marketSession";

// Re-renders every second with the current VN clock and trading session.
export function useMarketClock(): SessionInfo & { now: number } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return { ...marketSession(now), now };
}

// Polling interval that is fast while prices move and slow otherwise. Re-checks
// the session once a minute, so the switch happens on its own at 9:00, 11:30…
export function useLivePoll(liveMs: number, idleMs = 5 * 60 * 1000): number {
  const [live, setLive] = useState(() => marketSession().live);
  useEffect(() => {
    const id = setInterval(() => setLive(marketSession().live), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return live ? liveMs : idleMs;
}
