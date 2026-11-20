import { useCallback, useSyncExternalStore } from "react";

// Light / dark for the whole site, chosen with the sun/moon button in the
// header and remembered in this browser. Dark is the default (the Bull Stock
// moss-dark look). Dark puts .theme-dark on <html>: the neutral and brand
// colour scales flip inside it (see index.css), so pages written for the light
// page read correctly on dark without per-component variants. The header and
// the Giới thiệu landing are dark in both modes by design.
//
// The old Tailwind "dark" class (html.dark) is not used: it would flip the
// colours a second time on top of .theme-dark.

const STORAGE_KEY = "bullstock.theme";

export type Theme = "light" | "dark";

// Sơn mài is a dark-only design: the light theme is retired, so a saved
// "light" choice from before is ignored.
function readSaved(): Theme {
  return "dark";
}

let theme: Theme = readSaved();
const listeners = new Set<() => void>();

function applyToDocument() {
  const root = document.documentElement;
  root.classList.toggle("theme-dark", theme === "dark");
  root.classList.remove("dark");
  root.style.colorScheme = theme;
}

applyToDocument();

function setTheme(next: Theme) {
  theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable — the choice lasts for this visit only */
  }
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
