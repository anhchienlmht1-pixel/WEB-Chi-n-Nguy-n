import { useEffect, useRef, useState } from "react";
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

function browserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function sendBrowserNotification(freshHits: TrendBuySignal[]) {
  const title =
    freshHits.length === 1
      ? `${freshHits[0].symbol}: tín hiệu MUA mới`
      : `${freshHits.length} mã có tín hiệu MUA mới`;
  const body =
    freshHits.length === 1
      ? `Trend-following (SMA20>SMA50, ADX(14)>25, Supertrend tăng) — giá ${freshHits[0].price.toLocaleString("vi-VN")}`
      : freshHits.map((h) => h.symbol).join(", ");
  const notif = new Notification(title, { body, icon: "/logo-bull.png", tag: "trend-signals" });
  notif.onclick = () => {
    window.focus();
    if (freshHits.length === 1) window.location.href = `/stock/${freshHits[0].symbol}`;
    notif.close();
  };
}

export function useTrendSignalNotifications() {
  const [hits, setHits] = useState<TrendBuySignal[]>([]);
  const [newHits, setNewHits] = useState<TrendBuySignal[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    browserNotificationSupported() ? Notification.permission : "unsupported"
  );
  // In-memory only (not persisted) — separate from the localStorage "acked"
  // set that drives the badge. Keeps a browser Notification from firing
  // again on every 5-minute poll for the same still-unacknowledged signal;
  // the badge itself is fine staying up until the reader actually opens
  // the bell, but a repeat OS popup for the same signal every poll would
  // just be spam.
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchTrendBuySignals();
        if (cancelled) return;
        setHits(data);
        const acked = readAcked();
        const fresh = data.filter((h) => acked[h.symbol] !== h.signalSince);
        setNewHits(fresh);

        if (permission === "granted") {
          const toNotify = fresh.filter((h) => !notifiedRef.current.has(`${h.symbol}|${h.signalSince}`));
          if (toNotify.length > 0) {
            for (const h of toNotify) notifiedRef.current.add(`${h.symbol}|${h.signalSince}`);
            sendBrowserNotification(toNotify);
          }
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  // Marks every currently-listed signal as seen — called when the reader
  // opens the bell, same as any other notification list "read on open".
  function acknowledge() {
    if (hits.length === 0) return;
    const acked = readAcked();
    for (const h of hits) acked[h.symbol] = h.signalSince;
    writeAcked(acked);
    setNewHits([]);
  }

  async function requestPermission() {
    if (!browserNotificationSupported()) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return { hits, newHits, acknowledge, permission, requestPermission };
}
