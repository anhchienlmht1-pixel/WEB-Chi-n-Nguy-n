import { useEffect, useState } from "react";
import { fetchTrendBuySignals, type TrendBuySignal } from "../api/client";

// "New" is keyed off signalSince (the ISO date a buy streak started), not
// just symbol membership — so a symbol whose streak is still ongoing never
// re-triggers the badge, but the same symbol starting a genuinely fresh
// streak later (after its previous one ended) does.
const STORAGE_KEY = "stockdash.trendSignalsAcked";
const POLL_MS = 5 * 60 * 1000; // server caches the scan for 1h — matches TrendSignalScanner's own cadence

function readAcked(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeAcked(next: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage full/unavailable — badge just won't persist across
    // reloads, not worth failing the notification feature over.
  }
}

export function useTrendSignalNotifications() {
  const [hits, setHits] = useState<TrendBuySignal[]>([]);
  const [newHits, setNewHits] = useState<TrendBuySignal[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchTrendBuySignals();
        if (cancelled) return;
        setHits(data);
        const acked = readAcked();
        setNewHits(data.filter((h) => acked[h.symbol] !== h.signalSince));
      } catch {
        // Fails silently here — TrendSignalScanner on the dashboard already
        // surfaces a real error message for this same scan if it's broken;
        // the notification bell just skips updating until the next poll.
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Marks every currently-listed signal as seen — called when the reader
  // opens the bell, same as any other notification list "read on open".
  function acknowledge() {
    if (hits.length === 0) return;
    const acked = readAcked();
    for (const h of hits) acked[h.symbol] = h.signalSince;
    writeAcked(acked);
    setNewHits([]);
  }

  return { hits, newHits, acknowledge };
}
