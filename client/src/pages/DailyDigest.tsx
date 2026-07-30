import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { DigestMarketPulse, DigestStockRef, FundamentalMetric, MarketSnapshot } from "../types";
import { fetchDailyDigest, fetchDailyDigestByDate, fetchDailyDigestHistory } from "../api/client";
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

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
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

function shortPeriodLabel(label: string): string {
  const m = label.match(/^Q(\d)\s+(\d{4})$/);
  return m ? `Q${m[1]}/${m[2].slice(2)}` : label;
}

// Compact bar chart for a revenue/profit trend — up to 8 periods, all bars
// grow from the baseline (height ∝ |value|), colored by sign so a loss
// quarter still reads at a glance even though it isn't drawn below a zero
// line. Deliberately lighter-weight than components/ProfitChart.tsx, which
// is built for a full-width dedicated panel rather than sitting inside a
// digest card alongside other content.
function FundamentalChart({ label, metric }: { label: string; metric: FundamentalMetric | null }) {
  if (!metric || metric.history.length === 0) return null;
  const growth = metric.yoyGrowthPercent ?? metric.qoqGrowthPercent;
  const growthLabel = metric.yoyGrowthPercent !== null ? "so với cùng kỳ" : "so với kỳ trước";
  const CHART_H = 56;
  const maxAbs = Math.max(1, ...metric.history.map((h) => Math.abs(h.value)));

  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {label} <span className="text-slate-400 dark:text-slate-500">({metric.periodLabel})</span>
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {metric.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
            {metric.unit ? ` ${metric.unit}` : ""}
          </span>
          {growth !== null && (
            <span
              className={growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
              title={growthLabel}
            >
              {growth >= 0 ? "+" : ""}
              {growth.toFixed(1)}%
            </span>
          )}
        </span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: CHART_H }}>
        {metric.history.map((h) => (
          <div
            key={h.periodLabel}
            className="flex flex-1 items-end justify-center"
            style={{ height: CHART_H }}
            title={`${h.periodLabel}: ${h.value.toLocaleString("vi-VN")}${metric.unit ? ` ${metric.unit}` : ""}`}
          >
            <div
              className={`w-full rounded-t ${h.value >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
              style={{ height: Math.max(3, (Math.abs(h.value) / maxAbs) * CHART_H) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {metric.history.map((h) => (
          <div key={h.periodLabel} className="flex-1 truncate text-center text-[9px] text-slate-400 dark:text-slate-500">
            {shortPeriodLabel(h.periodLabel)}
          </div>
        ))}
      </div>
    </div>
  );
}

function StockMiniRow({ s, valueLabel }: { s: DigestStockRef; valueLabel?: string }) {
  return (
    <Link
      to={`/stock/${s.symbol}`}
      className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <span className="font-semibold text-slate-800 dark:text-slate-100">{s.symbol}</span>
      <span className="flex items-center gap-2">
        {valueLabel ? (
          <span className="text-slate-500 dark:text-slate-400">{valueLabel}</span>
        ) : (
          <span className={s.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
            {formatPercent(s.changePercent)}
          </span>
        )}
      </span>
    </Link>
  );
}

function tradedValueLabel(s: DigestStockRef): string {
  const value = s.price * s.volume;
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)} nghìn tỷ đ`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ đ`;
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

// Always-present "market at a glance" block — top movers + top liquidity —
// alongside whatever the day's single narrative topic is.
function MarketSnapshotSection({ snapshot }: { snapshot: MarketSnapshot }) {
  const hasMovers = snapshot.topGainers.length > 0 || snapshot.topLosers.length > 0;
  if (!hasMovers && snapshot.topTraded.length === 0) return null;

  return (
    <div className="mt-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Diễn biến thị trường hôm nay
      </div>

      {snapshot.mostActive && (
        <div className="mb-4 rounded-md bg-amber-50 p-2.5 text-xs dark:bg-amber-500/10">
          <span className="font-semibold text-amber-800 dark:text-amber-300">
            Mã được chú ý nhất: {snapshot.mostActive.symbol}
          </span>
          <span className="text-amber-700/80 dark:text-amber-400/80">
            {" "}
            — đo theo thanh khoản giao dịch cao nhất phiên ({tradedValueLabel(snapshot.mostActive)}), không phải dữ
            liệu mạng xã hội thật.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {snapshot.topGainers.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Top tăng giá
            </div>
            {snapshot.topGainers.map((s) => (
              <StockMiniRow key={s.symbol} s={s} />
            ))}
          </div>
        )}
        {snapshot.topLosers.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              Top giảm giá
            </div>
            {snapshot.topLosers.map((s) => (
              <StockMiniRow key={s.symbol} s={s} />
            ))}
          </div>
        )}
        {snapshot.topTraded.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Top thanh khoản
            </div>
            {snapshot.topTraded.slice(0, 5).map((s) => (
              <StockMiniRow key={s.symbol} s={s} valueLabel={tradedValueLabel(s)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function DailyDigest() {
  // null = today (live, polled); a date string = browsing history (fetched
  // once, no polling needed since a past day's article never changes).
  const [viewDate, setViewDate] = useState<string | null>(null);
  const { data, error, loading } = usePolling(
    () => (viewDate ? fetchDailyDigestByDate(viewDate) : fetchDailyDigest()),
    [viewDate],
    viewDate ? 0 : 5 * 60 * 1000
  );
  // Best-effort list of past days still held in the server's cache — see
  // the durability caveat in server/src/routes/stocks.ts (DAILY_DIGEST_TTL).
  const { data: history } = usePolling(fetchDailyDigestHistory, [], 5 * 60 * 1000);

  // Thumbnail + title show first — the rest of the article only renders
  // once the reader clicks through, like a blog listing's teaser card.
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Switching to a different day (today <-> history) should re-show that
  // day's own teaser rather than staying expanded from whatever was open.
  useEffect(() => {
    setExpanded(false);
  }, [data?.date]);

  function openArticle() {
    setExpanded(true);
    requestAnimationFrame(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const dateLabel = data
    ? new Date(data.date).toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bài viết &amp; Phân tích</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Mỗi ngày một chủ đề, chọn tự động dựa trên biến động thực tế của thị trường trong phiên.
        </p>
      </div>

      {history && history.items.length > 1 && (
        <div className="mb-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Bài viết trước
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {history.items.map((h) => (
              <button
                key={h.date}
                type="button"
                onClick={() => setViewDate(h.date === todayIso() ? null : h.date)}
                className={`flex shrink-0 flex-col items-start gap-0.5 rounded-lg border px-3 py-1.5 text-left transition-colors ${
                  (viewDate ?? todayIso()) === h.date
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/10"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {shortDate(h.date)}
                </span>
                <span className="max-w-[160px] truncate text-xs text-slate-700 dark:text-slate-300">{h.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && !data && <p className="text-slate-500 dark:text-slate-400">Đang tải bản tin...</p>}

      {error && !data && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="font-medium text-red-600 dark:text-red-400">Lỗi tải bản tin</p>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300/90">{error}</p>
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
                  className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
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

            <MarketSnapshotSection snapshot={data.marketSnapshot} />

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

                {(data.company.revenue || data.company.profit) && (
                  <div className="mb-3 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                    <FundamentalChart label="Doanh thu" metric={data.company.revenue} />
                    <FundamentalChart label="Lợi nhuận sau thuế" metric={data.company.profit} />
                  </div>
                )}

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
          )}
        </article>
      )}
    </div>
  );
}
