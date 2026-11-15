import { Star } from "lucide-react";
import { useWatchlist } from "../hooks/useWatchlist";

// Star toggle for the personal watchlist. Teal when watched (not amber/orange:
// orange is reserved for the one attention point on a screen).
export default function WatchButton({ symbol }: { symbol: string }) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(symbol);
  const label = watched ? `Bỏ theo dõi ${symbol}` : `Thêm ${symbol} vào danh sách theo dõi`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(symbol);
      }}
      title={label}
      aria-label={label}
      aria-pressed={watched}
      // Bare star, no box: faint until the row is hovered or it's watched.
      className={`flex h-11 w-8 shrink-0 items-center justify-center transition-colors duration-200 ${
        watched ? "text-brand-700" : "text-slate-400 hover:text-brand-700 group-hover:text-slate-600"
      }`}
    >
      <Star className="h-4 w-4" strokeWidth={1.75} fill={watched ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
