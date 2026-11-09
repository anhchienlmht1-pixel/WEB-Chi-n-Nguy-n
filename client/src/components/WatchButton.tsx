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
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 ${
        watched
          ? "border-emerald-700 bg-emerald-50 text-emerald-700"
          : "border-slate-300 text-slate-500 hover:border-emerald-700 hover:text-emerald-700"
      }`}
    >
      <Star className="h-4 w-4" strokeWidth={1.75} fill={watched ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
