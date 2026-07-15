"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

// The blocking inline script in layout.tsx already sets the "dark" class on
// <html> before hydration, so reading it here (lazy init, not an effect)
// gives the correct value on the very first client render with no flash.
function initialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

function subscribeNever() {
  return () => {};
}

/**
 * True once the component has hydrated on the client. Server render and the
 * first client render both report false (matching), so theme-dependent
 * markup can wait for this before showing values the server can't know
 * (localStorage isn't available during SSR).
 */
export function useHasMounted() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}
