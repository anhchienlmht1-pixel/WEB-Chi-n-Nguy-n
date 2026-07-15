"use client";

import { Moon, Sun } from "lucide-react";
import { useHasMounted, useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const mounted = useHasMounted();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        !mounted ? "Đổi giao diện sáng/tối" : theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"
      }
      className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      {!mounted ? null : theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
