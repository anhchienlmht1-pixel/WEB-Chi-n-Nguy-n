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
          ? "border-amber-400 bg-amber-400/10 text-amber-400"
          : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-200"
      }`}
    >
      {watched ? "★" : "☆"}
    </button>
  );
}
