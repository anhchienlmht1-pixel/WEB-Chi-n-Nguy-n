import { Star } from "lucide-react";
import { useWatchlist } from "../hooks/useWatchlist";

export default function WatchButton({ symbol }: { symbol: string }) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(symbol);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(symbol);
      }}
      title={watched ? "Bỏ theo dõi" : "Thêm vào danh sách theo dõi"}
      className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors duration-300 ${
        watched
          ? "border-amber-400 bg-amber-50 text-amber-500 dark:border-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
          : "border-slate-300 text-slate-400 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-500 dark:border-slate-700 dark:text-slate-500 dark:hover:border-amber-600 dark:hover:bg-amber-950/10 dark:hover:text-amber-400"
      }`}
    >
      <Star className="h-4 w-4" strokeWidth={1.75} fill={watched ? "currentColor" : "none"} />
    </button>
  );
}
