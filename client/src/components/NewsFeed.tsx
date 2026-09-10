import { fetchNewsForSymbol } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import WordCloud from "./WordCloud";

function formatPubDate(iso: string | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NewsFeed({ symbol }: { symbol: string }) {
  const { data, error, loading } = usePolling(() => fetchNewsForSymbol(symbol, 10), [symbol], 10 * 60 * 1000);
  const items = data?.items ?? [];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Tin tức liên quan đến {symbol}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Lọc từ tin mới nhất của CafeF</p>
      </div>

      {items.length > 0 && (
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <WordCloud items={items} heading="Từ khóa nổi bật" />
        </div>
      )}

      {loading && !data && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="p-4 text-sm text-slate-1000 dark:text-slate-400">
          Không tải được tin tức: {error}
        </div>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {item.source}
                  {formatPubDate(item.pubDate) ? ` · ${formatPubDate(item.pubDate)}` : ""}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
          Không tìm thấy tin tức gần đây nhắc đến mã {symbol}.
          {data && (
            <span className="mt-1 block text-xs text-slate-400 dark:text-slate-600">
              (Đã kiểm tra {data.poolSize} bài từ {data.usedFeed})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
