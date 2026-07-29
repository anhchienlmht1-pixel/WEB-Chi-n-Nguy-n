import { Link } from "react-router-dom";
import { fetchDailyDigest } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatPercent, formatPrice, formatVolume } from "../utils/format";

const TOPIC_BADGE_CLASS: Record<string, string> = {
  spotlight: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  sector: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  liquidity: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  breadth: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const TONE_CLASS: Record<string, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-slate-600 dark:text-slate-300",
};

export default function DailyDigest() {
  // Refetching every few minutes is enough — the server already pins one
  // article per calendar day, so this is only here to pick up a fresh topic
  // right after midnight without a manual page reload.
  const { data, error, loading } = usePolling(fetchDailyDigest, [], 5 * 60 * 1000);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bản tin thị trường</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Mỗi ngày một chủ đề, chọn tự động dựa trên biến động thực tế của thị trường trong phiên.
        </p>
      </div>

      {loading && !data && <p className="text-slate-500 dark:text-slate-400">Đang tải bản tin...</p>}

      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải bản tin</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
        </div>
      )}

      {data && (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                TOPIC_BADGE_CLASS[data.topic] ?? TOPIC_BADGE_CLASS.breadth
              }`}
            >
              {data.topicLabel}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {new Date(data.date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
            </span>
          </div>

          <h2 className="mb-4 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">{data.title}</h2>

          {data.highlights.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 sm:grid-cols-4">
              {data.highlights.map((h) => (
                <div key={h.label}>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{h.label}</div>
                  <div className={`text-sm font-semibold ${TONE_CLASS[h.tone]}`}>{h.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {data.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {data.relatedStocks.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Mã liên quan
              </div>
              <div className="flex flex-wrap gap-2">
                {data.relatedStocks.map((s) => (
                  <Link
                    key={s.symbol}
                    to={`/stock/${s.symbol}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{s.symbol}</span>
                    <span className={s.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                      {formatPercent(s.changePercent)}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">{formatPrice(s.price, "VND")}</span>
                    <span className="text-slate-400 dark:text-slate-500">{formatVolume(s.volume)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="mt-5 text-[11px] text-slate-400 dark:text-slate-500">
            Nguồn dữ liệu: {data.provider}. Nội dung được tổng hợp tự động, không phải khuyến nghị đầu tư.
          </p>
        </article>
      )}
    </div>
  );
}
