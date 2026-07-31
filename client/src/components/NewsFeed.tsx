import { useMemo } from "react";
import { fetchNewsForSymbol } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import type { NewsItem } from "../types";

function formatPubDate(iso: string | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Vietnamese is written one syllable per token, so single-word frequency
// is mostly noise ("giá", "cổ", "phiếu" show up everywhere). Adjacent
// non-stopword pairs approximate real compound words/phrases ("ngân
// hàng", "lợi nhuận", "kết quả kinh doanh") without needing a real NLP
// tokenizer — good enough for a glance at what recent headlines repeat.
const STOPWORDS = new Set([
  "và", "của", "cho", "các", "là", "trong", "với", "được", "này", "đã", "một", "để", "có", "khi",
  "sau", "vào", "ra", "về", "từ", "theo", "tại", "trên", "sẽ", "còn", "nên", "như", "nhiều", "rất",
  "vẫn", "những", "cũng", "đến", "hơn", "vì", "do", "bị", "phải", "mới", "chưa", "không", "gì",
  "đó", "đây", "thì", "nếu", "hay", "hoặc", "cả", "lại", "đang", "trước", "giữa", "cùng", "sao",
  "đi", "còn", "vậy", "chỉ", "sẽ", "đều", "bởi",
]);

interface WordCloudEntry {
  phrase: string;
  count: number;
  size: number;
  className: string;
}

const WORD_COLORS = [
  "text-emerald-600 dark:text-emerald-400",
  "text-sky-600 dark:text-sky-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
  "text-violet-600 dark:text-violet-400",
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function extractPhrases(items: Pick<NewsItem, "title" | "description">[]): WordCloudEntry[] {
  const freq = new Map<string, number>();
  for (const item of items) {
    const words = tokenize(`${item.title} ${item.description ?? ""}`);
    for (let i = 0; i < words.length - 1; i++) {
      const [a, b] = [words[i], words[i + 1]];
      if (a.length < 2 || b.length < 2 || STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
      const phrase = `${a} ${b}`;
      freq.set(phrase, (freq.get(phrase) ?? 0) + 1);
    }
  }
  const sorted = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  if (sorted.length === 0) return [];
  const max = sorted[0][1];
  const min = sorted[sorted.length - 1][1];
  return sorted.map(([phrase, count], i) => {
    const t = max === min ? 1 : (count - min) / (max - min);
    return { phrase, count, size: 0.8 + t * 1.1, className: WORD_COLORS[i % WORD_COLORS.length] };
  });
}

function NewsWordCloud({ items }: { items: NewsItem[] }) {
  const words = useMemo(() => extractPhrases(items), [items]);
  if (words.length === 0) return null;

  return (
    <div className="border-b border-slate-200 p-4 dark:border-slate-800">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Từ khóa nổi bật
      </h4>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {words.map(({ phrase, count, size, className }) => (
          <span
            key={phrase}
            title={`Xuất hiện ${count} lần trong tin gần đây`}
            style={{ fontSize: `${size}rem` }}
            className={`font-semibold leading-none ${className}`}
          >
            {phrase}
          </span>
        ))}
      </div>
    </div>
  );
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

      {items.length > 0 && <NewsWordCloud items={items} />}

      {loading && !data && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="p-4 text-sm text-red-500 dark:text-red-400">
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
