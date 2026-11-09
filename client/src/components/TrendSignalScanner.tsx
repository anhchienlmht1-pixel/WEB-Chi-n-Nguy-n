import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, RefreshCw, Star, Search } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchTrendBuyResult } from "../api/client";
import { formatPercent, formatPrice } from "../utils/format";
import { formatSessionDate, isMarketInSession } from "../utils/sessionClose";
import { useWatchlist } from "../hooks/useWatchlist";
import WatchButton from "./WatchButton";
import CompanyLogo from "./CompanyLogo";

// The conclusion only changes once a session closes (15:00) — the server holds it
// until then — so a gentle poll is enough to pick the new one up.
const POLL_MS = 5 * 60 * 1000;

function formatSince(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// Whole days between the buy date and the session the list was concluded on
// (not "now"), so the holding time and the P/L next to it describe the same
// closing price: "đang nắm giữ N ngày" instead of decoding a bare date.
function daysHeld(buyIso: string, sessionIso: string): number {
  const start = new Date(buyIso).getTime();
  const end = new Date(sessionIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

// Column template shared by the header and every row: Mã | Ngày vào | Lãi/lỗ.
// Fixed widths for the two right-hand columns so every row lines up.
const COLS = "grid-cols-[minmax(0,1fr)_5.5rem_5rem]";

const SHELL = "overflow-hidden rounded-md border border-slate-200 bg-white";
const TITLE = "text-xl font-bold leading-snug text-emerald-700";

// Reusable card shell so the loading / error / empty / list states all share
// the same header and framing — the panel never "jumps" between states.
function Panel({
  children,
  subtitle,
  fill,
  badge,
  action,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  fill?: boolean;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`${SHELL} ${fill ? "flex h-full flex-col" : ""}`}>
      <div className="shrink-0 px-5 pb-3 pt-5">
        <div className="flex items-center gap-3">
          <h3 className={`${TITLE} whitespace-nowrap`}>Tín hiệu MUA</h3>
          {badge}
        </div>
        <p className="mt-1.5 text-sm leading-normal text-slate-600">
          {subtitle ?? "Cổ phiếu đang trong xu hướng tăng và chưa xuất hiện điểm bán."}
        </p>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {children}
    </div>
  );
}

// Lists every stock in the universe currently on a buy signal per the same
// trend-following combo as the chart's own Mua/Bán markers (SMA20 > SMA50,
// ADX(14) > 25, Supertrend(10,3) uptrend) — computed once server-side
// across ~70 symbols and cached, rather than the browser looping through
// dozens of per-symbol history fetches itself.
export default function TrendSignalScanner({
  onSelectSymbol,
  fill = false,
}: {
  /** Switches the chart sitting next to this panel to the clicked symbol
   * in place, instead of navigating away to the stock detail page —
   * passed on every page that renders this beside a chart.
   * Falls back to a normal /stock/:symbol navigation when omitted. */
  onSelectSymbol?: (symbol: string) => void;
  /** Stretch to the height of the parent (which must have one) instead of
   * sizing to the content: the header stays put and only the list scrolls.
   * Used to keep the panel exactly as tall as the chart next to it. */
  fill?: boolean;
}) {
  const { data: result, error, loading, refetch } = usePolling(() => fetchTrendBuyResult(), [], POLL_MS);
  const hits = result?.items ?? null;
  const sessionDate = result?.sessionDate ?? null;
  const { addMany } = useWatchlist();

  // First load — the server scans ~70 symbols, so tell the user it's working
  // instead of leaving a bare spinner that reads as "broken".
  if (loading && !hits) {
    return (
      <Panel fill={fill} subtitle="Đang quét toàn bộ thị trường để tìm cổ phiếu đang tăng giá…">
        <div className="space-y-2 p-4" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-slate-100" />
              <div className="h-8 flex-1 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  // Friendly, non-technical error with a retry — a cold-cache scan can exceed
  // the request timeout, which is normal on the very first visit.
  if (error && !hits) {
    const isTimeout = /timeout/i.test(error);
    return (
      <Panel fill={fill}>
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Clock className="h-5 w-5 text-emerald-700" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-slate-900">
            {isTimeout ? "Đang tổng hợp dữ liệu thị trường" : "Chưa tải được danh sách tín hiệu"}
          </p>
          <p className="max-w-xs text-sm leading-normal text-slate-600">
            {isTimeout
              ? "Lần tải đầu tiên hệ thống cần quét khoảng 70 mã nên có thể mất vài giây. Bạn hãy thử lại nhé."
              : "Có thể do kết nối tạm thời gián đoạn. Vui lòng thử lại sau giây lát."}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-emerald-700 px-4 text-base font-bold text-emerald-700 transition-colors duration-200 hover:bg-emerald-50"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Thử lại
          </button>
        </div>
      </Panel>
    );
  }

  if (!hits || !sessionDate) return null;

  // "Chỉ kết luận khi đóng phiên": during the 09:00–15:00 session the list is
  // still the previous session's conclusion — say so, instead of letting a
  // reader assume it is moving with the live price.
  const inSession = isMarketInSession();
  const sessionLabel = `Chốt phiên ${formatSessionDate(sessionDate)}`;

  const subtitle = (
    <>
      <span className="font-bold text-emerald-700">{hits.length} cổ phiếu</span> đang trong xu hướng tăng, chưa xuất hiện
      điểm bán.
      <span
        className="mt-0.5 block text-sm text-slate-600"
        title="Điều kiện: SMA20 > SMA50, ADX(14) > 25 và Supertrend(10,3) đang báo tăng. Tính trên nến ngày đã đóng cửa; kết luận mới chỉ có sau 15:00."
      >
        {sessionLabel} · Trend Following ⓘ
      </span>
      {inSession && (
        <span className="mt-0.5 block text-sm font-bold text-orange-700">
          Đang trong phiên: kết luận mới sẽ chốt sau 15:00.
        </span>
      )}
    </>
  );

  return (
    <Panel
      fill={fill}
      subtitle={subtitle}
      badge={
        <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-0.5 text-sm font-bold text-emerald-700">
          {hits.length} mã
        </span>
      }
      action={
        hits.length > 0 ? (
          <button
            type="button"
            onClick={() => addMany(hits.map((h) => h.symbol))}
            title="Thêm tất cả mã trong danh sách vào mục theo dõi của bạn"
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md border-2 border-emerald-700 px-3 text-sm font-bold text-emerald-700 transition-colors duration-200 hover:bg-emerald-50"
          >
            <Star className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Theo dõi tất cả
          </button>
        ) : undefined
      }
    >
      {hits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Search className="h-5 w-5 text-emerald-700" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-slate-900">Chưa có mã nào khớp tín hiệu MUA</p>
          <p className="max-w-xs text-sm leading-normal text-slate-600">
            Hiện không cổ phiếu nào hội đủ 3 điều kiện của xu hướng tăng. Danh sách được chốt lại sau mỗi phiên đóng cửa
            (15:00).
          </p>
        </div>
      ) : (
        <div className={`overflow-y-auto border-t border-slate-200 ${fill ? "min-h-0 flex-1" : "max-h-[28rem]"}`}>
          {/* Sticky column header — shares COLS with every row below, and a
           * spacer the width of the row's star button, so the labels sit
           * exactly over their values while the list scrolls. */}
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-slate-600 sm:px-5">
            <span className="w-11 shrink-0" aria-hidden="true" />
            <div className={`grid min-w-0 flex-1 gap-2 ${COLS}`}>
              <span>Mã</span>
              <span>Ngày vào</span>
              <span className="text-right">Lãi/lỗ</span>
            </div>
          </div>
          {hits.map((h) => {
            const held = daysHeld(h.buyDate, sessionDate);
            const gainClass =
              h.signalReturnPercent > 0
                ? "text-emerald-700"
                : h.signalReturnPercent < 0
                  ? "text-[#c0392b]"
                  : "text-slate-600";
            // Entry price/date and the current price live in the row tooltip.
            const rowTitle = `${h.symbol}: vào tín hiệu ngày ${formatSince(h.buyDate)} ở giá ${formatPrice(h.buyPrice, h.currency)}, giá đóng cửa phiên ${formatSessionDate(sessionDate)} ${formatPrice(h.price, h.currency)}`;
            // WatchButton is its own <button> — kept as a sibling rather
            // than nested inside the row's own clickable element, since a
            // <button> (or an <a>) can't validly contain another <button>.
            const cells = (
              <>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="hidden shrink-0 sm:inline-flex">
                    <CompanyLogo symbol={h.symbol} size={32} fallback="space" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-lg font-bold leading-tight text-slate-900">{h.symbol}</span>
                    <span className="truncate text-sm leading-tight text-slate-600">{h.exchange}</span>
                  </span>
                </span>
                <span className="flex flex-col text-slate-900">
                  <span className="text-base leading-tight tabular-nums">{formatSince(h.buyDate)}</span>
                  <span className="text-sm leading-tight text-slate-600">{held > 0 ? `${held} ngày` : "Mới vào"}</span>
                </span>
                <span className={`justify-self-end whitespace-nowrap text-base font-bold tabular-nums ${gainClass}`}>
                  {formatPercent(h.signalReturnPercent)}
                </span>
              </>
            );
            const rowClass = `grid min-h-11 min-w-0 flex-1 items-center gap-2 text-left ${COLS}`;
            // Switches the sibling chart in place when one's provided;
            // otherwise falls back to navigating to the stock detail page.
            return (
              <div
                key={h.symbol}
                className="relative flex min-h-15 items-center gap-2 border-b border-slate-100 px-3 py-2 transition-colors duration-200 hover:bg-slate-50 sm:px-5"
              >
                <WatchButton symbol={h.symbol} />
                {onSelectSymbol ? (
                  <button type="button" title={rowTitle} onClick={() => onSelectSymbol(h.symbol)} className={rowClass}>
                    {cells}
                  </button>
                ) : (
                  <Link to={`/stock/${h.symbol}`} title={rowTitle} className={rowClass}>
                    {cells}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
