import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "stockdash.positions";

export interface Position {
  symbol: string;
  buyPrice: number;
  // ISO date (yyyy-mm-dd) — no time component, matches the daily bars this
  // is compared against.
  buyDate: string;
}

function readStorage(): Record<string, Position> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Position>) : {};
  } catch {
    return {};
  }
}

// Module-level store shared by every usePositions() consumer — same
// pattern as useWatchlist.ts — so saving a position in one component
// instance is immediately visible to any other (e.g. the sticky contact
// bar reading the same symbol).
let positions = readStorage();
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return positions;
}

// Purely a personal, per-browser memory aid ("giá vốn của tôi cho mã
// này") — not synced anywhere, not the platform's own Mua/Bán system.
export function usePositions() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  const get = useCallback((symbol: string): Position | null => current[symbol] ?? null, [current]);

  const save = useCallback((symbol: string, buyPrice: number, buyDate: string) => {
    positions = { ...positions, [symbol]: { symbol, buyPrice, buyDate } };
    persist();
  }, []);

  const clear = useCallback((symbol: string) => {
    if (!(symbol in positions)) return;
    const next = { ...positions };
    delete next[symbol];
    positions = next;
    persist();
  }, []);

  return { positions: current, get, save, clear };
}
