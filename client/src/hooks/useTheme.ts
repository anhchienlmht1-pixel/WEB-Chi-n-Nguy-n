import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "stockdash.theme";

export type Theme = "light" | "dark";

// Module-level store so every consumer (charts, TradingView widget) sees the
// same theme and re-renders together. The redesigned site is light-only
// (white background): a "dark" value saved by an earlier version is ignored
// and cleared, and the header no longer offers a toggle.
let theme: Theme = "light";
try {
  localStorage.removeItem(STORAGE_KEY);
} catch {
  /* storage unavailable — nothing to clear */
}
const listeners = new Set<() => void>();

function applyToDocument() {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

applyToDocument();

function setTheme(next: Theme) {
  theme = next;
  localStorage.setItem(STORAGE_KEY, next);
  applyToDocument();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => theme);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, []);

  return { theme: current, toggle };
}
