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
  "đi", "vậy", "chỉ", "đều", "bởi",
]);

export interface WordCloudEntry {
  phrase: string;
  count: number;
  size: number;
  className: string;
}

export const WORD_CLOUD_COLORS = [
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

// Counts adjacent word-pairs across every item's title+description, ranks
// by raw occurrence count, and maps that count onto a font-size range —
// purely mechanical text-frequency, no sentiment/interpretation layered on
// top (never invents a bullish/bearish read that isn't literally what the
// headlines repeat).
export function extractPhrases(
  items: { title: string; description?: string }[],
  opts?: { minCount?: number; maxPhrases?: number }
): WordCloudEntry[] {
  const minCount = opts?.minCount ?? 2;
  const maxPhrases = opts?.maxPhrases ?? 20;
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
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPhrases);
  if (sorted.length === 0) return [];
  const max = sorted[0][1];
  const min = sorted[sorted.length - 1][1];
  return sorted.map(([phrase, count], i) => {
    const t = max === min ? 1 : (count - min) / (max - min);
    return { phrase, count, size: 0.8 + t * 1.1, className: WORD_CLOUD_COLORS[i % WORD_CLOUD_COLORS.length] };
  });
}
