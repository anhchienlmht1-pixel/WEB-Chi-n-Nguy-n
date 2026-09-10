import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { DigestMarketPulse } from "../types";
import { fetchDailyDigest, fetchDailyDigestByDate, fetchDailyDigestHistory } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { formatPercent, formatPrice, formatVolume } from "../utils/format";
import MarketNews from "../components/MarketNews";

const TOPIC_BADGE_CLASS: Record<string, string> = {
  spotlight: "bg-slate-100 text-slate-600 dark:bg-slate-1000/10 dark:text-slate-300",
  sector: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  liquidity: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  breadth: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const TONE_CLASS: Record<string, string> = {
  up: "text-slate-600 dark:text-slate-300",
  down: "text-slate-800 dark:text-slate-400",
  neutral: "text-slate-600 dark:text-slate-300",
};

function formatRatio(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function formatDateLabel(dateStr: string, style: "long" | "short" = "long"): string {
  const d = new Date(dateStr);
  return style === "long"
    ? d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
    : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Decorative "at a glance" graphic for the thumbnail — two bars sized off
// today's advancers/decliners split, plus a trend line/dot in the hero's
// tone. Illustrative (matches the article's overall mood), not a literal
// price chart for any one symbol.
function ThumbnailChart({ pulse, up }: { pulse: DigestMarketPulse; up: boolean }) {
  const maxCount = Math.max(pulse.advancers, pulse.decliners, 1);
  const barH = (n: number) => 8 + (n / maxCount) * 42;
  const lineColor = up ? "#34d399" : "#fb7185";
  const linePoints = up
    ? "70,54 92,44 114,34 136,16"
    : "70,16 92,26 114,38 136,54";
  const dot = up ? { x: 136, y: 16 } : { x: 136, y: 54 };

  return (
    <svg viewBox="0 0 150 64" className="h-16 w-full max-w-[170px]" role="presentation" aria-hidden="true">
      <rect x="16" y={60 - barH(pulse.decliners)} width="16" height={barH(pulse.decliners)} rx="2" fill="#f43f5e" opacity="0.55" />
      <rect x="40" y={60 - barH(pulse.advancers)} width="16" height={barH(pulse.advancers)} rx="2" fill="#10b981" opacity="0.8" />
      <polyline points={linePoints} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={dot.x} cy={dot.y} r="4" fill={lineColor} />
    </svg>
  );
}

export default function DailyDigest() {
  // null = today's article (the usual case); a date string means the
  // reader picked a past article from the archive below. Past articles
  // never change once written, so no point polling those — only "today"
  // (which the server itself may swap to a new topic after midnight)
  // needs the periodic refetch.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data, error, loading } = usePolling(
    () => (selectedDate ? fetchDailyDigestByDate(selectedDate) : fetchDailyDigest()),
    [selectedDate],
    selectedDate ? 0 : 5 * 60 * 1000
  );
  // Archive list of past articles — persisted server-side to Vercel Blob
  // (see server/src/digest/digestHistory.ts) so past days' articles stay
  // readable instead of disappearing once the in-memory "today" cache
  // moves on to a new date.
  const { data: history } = usePolling(fetchDailyDigestHistory, [], 0);
  // Thumbnail + title show first — the rest of the article only renders
  // once the reader clicks through, like a blog listing's teaser card.
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  function openArticle() {
    setExpanded(true);
    requestAnimationFrame(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // Clicking a past article from the archive is already an explicit "read
  // this" action, so it skips straight to expanded instead of making the
  // reader click "Đọc tiếp" a second time.
  function openHistoryEntry(date: string) {
    setSelectedDate(date);
    setExpanded(true);
    requestAnimationFrame(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function backToToday() {
    setSelectedDate(null);
    setExpanded(false);
  }

  const dateLabel = data ? formatDateLabel(data.date) : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bài viết &amp; Phân tích</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Mỗi ngày một chủ đề, chọn tự động dựa trên biến động thực tế của thị trường trong phiên.
        </p>
      </div>

      {loading && !data && <p className="text-slate-500 dark:text-slate-400">Đang tải bản tin...</p>}

      {error && !data && (
        <div className="rounded-lg border border-slate-300 bg-slate-100 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-slate-800 dark:text-slate-400">Lỗi tải bản tin</p>
          <p className="mt-1 text-sm text-slate-1000 dark:text-slate-300/90">{error}</p>
        </div>
      )}

      {selectedDate && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/50">
          <span className="text-slate-500 dark:text-slate-400">
            Đang xem bài viết đã lưu ngày {formatDateLabel(selectedDate, "short")}
          </span>
          <button
            type="button"
            onClick={backToToday}
            className="font-semibold text-slate-600 hover:underline dark:text-slate-300"
          >
            ← Bài viết hôm nay
          </button>
        </div>
      )}

      {data && (
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Thumbnail teaser — dark stat card + title/excerpt/CTA, laid out
              like a blog listing's featured-post card. */}
          <div className="flex flex-col sm:flex-row">
            <div className="flex shrink-0 flex-col justify-between bg-slate-900 p-5 text-white dark:bg-black sm:w-[280px]">
              <div>
                <div className="text-3xl font-black leading-none tracking-tight">{data.heroStat.value}</div>
                <div className="mt-1 text-xs text-slate-400">{data.heroStat.label}</div>
                <ThumbnailChart pulse={data.marketPulse} up={data.heroStat.tone !== "down"} />
                <div className="space-y-0.5">
                  <p className="text-xl font-bold leading-snug">{data.hookLines[0]}</p>
                  <p
                    className={`text-xl font-bold leading-snug ${
                      data.heroStat.tone === "down" ? "text-rose-400" : "text-slate-300"
                    }`}
                  >
                    {data.hookLines[1]}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <img src="/logo-bull.png" alt="" className="h-7 w-7 shrink-0 rounded-full bg-white/10 object-contain p-0.5" />
                <span className="text-xs font-semibold tracking-wide text-slate-200">CHIẾN NGUYỄN INVEST</span>
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-center gap-2 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    TOPIC_BADGE_CLASS[data.topic] ?? TOPIC_BADGE_CLASS.breadth
                  }`}
                >
                  {data.topicLabel}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{dateLabel}</span>
              </div>
              <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">{data.title}</h2>
              <p className="line-clamp-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {data.paragraphs[0]}
              </p>
              {!expanded && (
                <button
                  type="button"
                  onClick={openArticle}
                  className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Đọc tiếp →
                </button>
              )}
            </div>
          </div>

          {expanded && (
          <div ref={contentRef} className="scroll-mt-20 border-t border-slate-200 p-5 dark:border-slate-800">
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
                    ? "border-slate-400 bg-slate-100 dark:border-emerald-900/60 dark:bg-emerald-950/30"
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
                        ? "bg-slate-600 text-white"
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
                            ? "text-slate-600 dark:text-slate-300"
                            : "text-slate-800 dark:text-slate-400"
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
          )}
        </article>
      )}

      {history && history.enabled && history.items.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Bài viết trước đó</h3>
          <div className="space-y-2">
            {history.items
              .filter((h) => h.date !== (data?.date ?? ""))
              .map((h) => (
                <button
                  key={h.date}
                  type="button"
                  onClick={() => openHistoryEntry(h.date)}
                  className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                >
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      TOPIC_BADGE_CLASS[h.topic] ?? TOPIC_BADGE_CLASS.breadth
                    }`}
                  >
                    {h.topicLabel}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {formatDateLabel(h.date, "short")}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">
                    {h.title}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <MarketNews />
      </div>
    </div>
  );
}
