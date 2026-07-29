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

function formatRatio(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

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
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Hero stat block — big number + two-line hook, mirrors a "market
              pulse" glance before the reader commits to the full article. */}
          <div className="bg-slate-900 p-5 text-white dark:bg-black">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium">{data.topicLabel}</span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-emerald-400">{data.marketPulse.advancers} tăng</span>
                <span className="text-red-400">{data.marketPulse.decliners} giảm</span>
              </span>
            </div>
            <div className="text-4xl font-black leading-none tracking-tight">{data.heroStat.value}</div>
            <div className="mt-1 text-xs text-slate-400">{data.heroStat.label}</div>
            <div className="mt-4 space-y-0.5">
              <p className="text-lg font-bold leading-snug">{data.hookLines[0]}</p>
              <p className="text-lg font-bold leading-snug text-slate-300">{data.hookLines[1]}</p>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  TOPIC_BADGE_CLASS[data.topic] ?? TOPIC_BADGE_CLASS.breadth
                }`}
              >
                {data.topicLabel}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(data.date).toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>

            <h2 className="mb-4 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">{data.title}</h2>

            {data.highlights.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 sm:grid-cols-4">
                {data.highlights.map((h) => (
                  <div key={h.label}>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {h.label}
                    </div>
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

            {data.company && (
              <div className="mt-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Thông tin doanh nghiệp — {data.company.symbol}
                </div>
                <div className="mb-3 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">P/E</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatRatio(data.company.valuation.pe)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">P/B</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatRatio(data.company.valuation.pb)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">ROE</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatRatio(data.company.valuation.roe)}
                      {data.company.valuation.roe !== null ? "%" : ""}
                    </div>
                  </div>
                </div>
                {data.company.businessModel && (
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {data.company.businessModel}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {data.company.sector && <span>Ngành: {data.company.sector}</span>}
                  {data.company.charterCapitalText && <span>Vốn điều lệ: {data.company.charterCapitalText}</span>}
                  {data.company.listingDate && <span>Niêm yết: {data.company.listingDate}</span>}
                </div>
              </div>
            )}

            {data.action && (
              <div
                className={`mt-4 rounded-lg border p-4 ${
                  data.action.stance === "MUA"
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                    : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Hành động của tôi (trend-following)
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      data.action.stance === "MUA"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-500 text-white dark:bg-slate-600"
                    }`}
                  >
                    {data.action.stanceLabel}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{data.action.reasoning}</p>
              </div>
            )}

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
                      <span
                        className={
                          s.changePercent >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
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
              Nguồn dữ liệu: {data.provider}. Nội dung + hành động nêu trên được tổng hợp/tính toán tự động theo quy
              tắc trend-following cố định, không phải khuyến nghị đầu tư.
            </p>
          </div>
        </article>
      )}
    </div>
  );
}
