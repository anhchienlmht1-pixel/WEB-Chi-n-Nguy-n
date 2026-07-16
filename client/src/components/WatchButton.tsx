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
      className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors ${
        watched
          ? "border-amber-500 bg-amber-500/10 text-amber-500 dark:border-amber-400 dark:text-amber-400"
          : "border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-200"
      }`}
    >
      {watched ? "★" : "☆"}
    </button>
  );
}
