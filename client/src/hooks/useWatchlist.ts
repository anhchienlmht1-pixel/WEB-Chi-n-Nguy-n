import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "stockdash.watchlist";

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// Module-level store shared by every useWatchlist() consumer, so toggling one
// symbol never clobbers changes made through a different component instance.
let symbols = readStorage();
const listeners = new Set<() => void>();

function setSymbols(next: string[]) {
  symbols = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return symbols;
}

export function useWatchlist() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  const isWatched = useCallback((symbol: string) => current.includes(symbol), [current]);

  const toggle = useCallback((symbol: string) => {
    setSymbols(
      symbols.includes(symbol) ? symbols.filter((s) => s !== symbol) : [...symbols, symbol]
    );
  }, []);

  const remove = useCallback((symbol: string) => {
    setSymbols(symbols.filter((s) => s !== symbol));
  }, []);

  // Idempotent add — unlike toggle(), never removes an already-watched
  // symbol, so it's safe to call in bulk (e.g. "add all of these") without
  // accidentally un-watching ones the user already added themselves.
  const addMany = useCallback((toAdd: string[]) => {
    const additions = toAdd.filter((s) => !symbols.includes(s));
    if (additions.length > 0) setSymbols([...symbols, ...additions]);
  }, []);

  return { symbols: current, isWatched, toggle, remove, addMany };
}
