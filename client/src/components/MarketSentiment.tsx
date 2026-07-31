import { fetchMarketNews } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import WordCloud from "./WordCloud";

// "Tâm lý thị trường" here is literally just word-frequency across recent
// market-wide headlines — not a computed sentiment score, not NLP
// classification. Named to match what it visually communicates (what
// terms are repeating across today's news), but the subtitle says exactly
// what it is so it doesn't read as an invented signal.
export default function MarketSentiment() {
  const { data, error, loading } = usePolling(() => fetchMarketNews(40), [], 10 * 60 * 1000);
  const items = data?.items ?? [];

  if (loading && !data) return null;
  if ((error && !data) || items.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <WordCloud
        items={items}
        heading="Tâm lý thị trường"
        subheading="Từ khóa lặp lại nhiều nhất trong tin tức thị trường gần đây — thống kê tần suất, không phải điểm tâm lý tính toán."
      />
    </div>
  );
}
