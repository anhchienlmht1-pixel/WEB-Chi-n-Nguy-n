import { useEffect, useState } from "react";

interface LogoEntry {
  logoUrl: string | null;
}

type LogoMap = Record<string, LogoEntry>;

// Shared across every mounted CompanyLogo — a comparison table can render
// dozens of logos at once, and each one asking usePolling to fetch
// independently would fire dozens of identical requests. This fetches the
// server's /api/company-logos map (itself a 24h-cached VNDirect bulk pull)
// exactly once, then just notifies every subscriber when it lands.
let cache: LogoMap | null = null;
let inflight: Promise<LogoMap> | null = null;
const listeners = new Set<() => void>();

function load(): Promise<LogoMap> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/company-logos")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<LogoMap>;
      })
      .then((data) => {
        cache = data;
        listeners.forEach((l) => l());
        return data;
      })
      .catch((err) => {
        inflight = null; // allow a later mount to retry
        throw err;
      });
  }
  return inflight;
}

/** Symbol -> logo URL map, once loaded (null before then, or if the fetch fails). */
export function useCompanyLogoMap(): LogoMap | null {
  const [, rerender] = useState(0);

  useEffect(() => {
    if (cache) return;
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    load().catch(() => {
      // Swallowed — callers just keep getting `null` and fall back on their own.
    });
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return cache;
}
