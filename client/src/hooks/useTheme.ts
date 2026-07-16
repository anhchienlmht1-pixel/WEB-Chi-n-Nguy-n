import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "stockdash.theme";

export type Theme = "light" | "dark";

// Module-level store so every consumer (header toggle, TradingView widget)
// sees the same theme and re-renders together.
let theme: Theme = localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
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
