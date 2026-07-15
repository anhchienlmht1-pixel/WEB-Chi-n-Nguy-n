"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "stockboard.watchlist";
const EVENT_NAME = "stockboard:watchlist-changed";

const EMPTY: string[] = [];

let cachedRaw: string | null = null;
let cachedSnapshot: string[] = EMPTY;

// useSyncExternalStore requires a stable reference when the underlying data
// hasn't changed, so we cache the parsed array keyed on the raw JSON string.
function readWatchlist(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    const parsed = raw ? JSON.parse(raw) : [];
    cachedRaw = raw;
    cachedSnapshot = Array.isArray(parsed) ? parsed : [];
    return cachedSnapshot;
  } catch {
    return EMPTY;
  }
}

function writeWatchlist(symbols: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT_NAME, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT_NAME, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

export function useWatchlist() {
  const symbols = useSyncExternalStore(subscribe, readWatchlist, getServerSnapshot);

  const toggle = useCallback((symbol: string) => {
    const current = readWatchlist();
    const next = current.includes(symbol)
      ? current.filter((s) => s !== symbol)
      : [...current, symbol];
    writeWatchlist(next);
  }, []);

  const remove = useCallback((symbol: string) => {
    const next = readWatchlist().filter((s) => s !== symbol);
    writeWatchlist(next);
  }, []);

  return { symbols, toggle, remove, has: (s: string) => symbols.includes(s) };
}
