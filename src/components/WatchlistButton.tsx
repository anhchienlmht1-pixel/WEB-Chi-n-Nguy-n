"use client";

import { Star } from "lucide-react";
import clsx from "clsx";
import { useWatchlist } from "@/lib/watchlist";

export function WatchlistButton({ symbol, className }: { symbol: string; className?: string }) {
  const { has, toggle } = useWatchlist();
  const active = has(symbol);

  return (
    <button
      type="button"
      aria-label={active ? "Bỏ theo dõi" : "Thêm vào danh mục theo dõi"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(symbol);
      }}
      className={clsx(
        "inline-flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-amber-400/10",
        className
      )}
    >
      <Star
        size={16}
        className={active ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-600"}
      />
    </button>
  );
}
