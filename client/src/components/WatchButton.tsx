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
      className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors ${
        watched
          ? "border-slate-1000 bg-slate-1000/10 text-slate-1000 dark:border-slate-300 dark:text-slate-300"
          : "border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-200"
      }`}
    >
      {watched ? "★" : "☆"}
    </button>
  );
}
