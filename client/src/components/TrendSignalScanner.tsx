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

// Column template shared by the header and every row: Mã | Sàn | Thời gian
// nắm giữ | Lãi/lỗ hiện tại. Fixed widths (not `auto`) so each row's columns line
// up with the others; the wider set kicks in off the panel's own width (container
// query), since this list sits in a narrow side column on desktop.
const COLS =
  "grid-cols-[minmax(0,1fr)_3rem_4rem_4.5rem] @md:grid-cols-[minmax(0,1fr)_4.5rem_8.5rem_7.5rem]";

// The list is a black panel in both themes (the editorial "band" colour), with
// square corners to match the rest of the home page.
const SHELL = "overflow-hidden bg-band text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)]";
const TITLE = "text-xs font-bold uppercase tracking-[0.14em]";

// Reusable card shell so the loading / error / empty / list states all share
// the same header and framing — the panel never "jumps" between states.
function Panel({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className={SHELL}>
      <div className="border-b border-white/10 px-5 pb-4 pt-5">
        <h4 className={TITLE}>Tín hiệu MUA</h4>
        <p className="mt-2.5 text-xs leading-relaxed text-quiet-on-band">
          {subtitle ?? "Cổ phiếu đang trong xu hướng tăng và chưa xuất hiện điểm bán."}
        </p>
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
}: {
  /** Switches the chart sitting next to this panel to the clicked symbol
   * in place, instead of navigating away to the stock detail page —
   * passed on every page that renders this beside a TechnicalChartPanel.
   * Falls back to a normal /stock/:symbol navigation when omitted. */
  onSelectSymbol?: (symbol: string) => void;
}) {
  const { data: result, error, loading, refetch } = usePolling(() => fetchTrendBuyResult(), [], POLL_MS);
  const hits = result?.items ?? null;
  const sessionDate = result?.sessionDate ?? null;
  const { addMany } = useWatchlist();

  // First load — the server scans ~70 symbols, so tell the user it's working
  // instead of leaving a bare spinner that reads as "broken".
  if (loading && !hits) {
    return (
      <Panel subtitle="Đang quét toàn bộ thị trường để tìm cổ phiếu đang tăng giá…">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse bg-white/10" />
              <div className="h-6 flex-1 animate-pulse bg-white/10" />
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
      <Panel subtitle="Cổ phiếu đang trong xu hướng tăng và chưa xuất hiện điểm bán.">
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <Clock className="h-5 w-5 text-quiet-on-band" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-white">
            {isTimeout ? "Đang tổng hợp dữ liệu thị trường" : "Chưa tải được danh sách tín hiệu"}
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-quiet-on-band">
            {isTimeout
              ? "Lần tải đầu tiên hệ thống cần quét khoảng 70 mã nên có thể mất vài giây. Bạn hãy thử lại nhé."
              : "Có thể do kết nối tạm thời gián đoạn. Vui lòng thử lại sau giây lát."}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-1 inline-flex items-center gap-1.5 border border-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors duration-300 hover:bg-white hover:text-band"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
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
      <span className="font-semibold text-green-400">{hits.length} cổ phiếu</span> đang trong xu hướng
      tăng, chưa xuất hiện điểm bán.
      <span
        className="mt-0.5 block text-[11px] text-quiet-on-band/70"
        title="Điều kiện: SMA20 > SMA50, ADX(14) > 25 và Supertrend(10,3) đang báo tăng. Tính trên nến ngày đã đóng cửa; kết luận mới chỉ có sau 15:00."
      >
        {sessionLabel} · Trend Following ⓘ
      </span>
      {inSession && (
        <span className="mt-0.5 block text-[11px] text-amber-400">
          Đang trong phiên: kết luận mới sẽ chốt sau 15:00.
        </span>
      )}
    </>
  );

  return (
    <div className={SHELL}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <h4 className={TITLE}>Tín hiệu MUA</h4>
          <p className="mt-2.5 text-xs leading-relaxed text-quiet-on-band">{subtitle}</p>
        </div>
        {hits.length > 0 && (
          <button
            type="button"
            onClick={() => addMany(hits.map((h) => h.symbol))}
            title="Thêm tất cả mã trong danh sách vào mục theo dõi của bạn"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border border-[#2fb39a] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2fb39a] transition-colors duration-200 hover:bg-[#2fb39a] hover:text-band"
          >
            <Star className="h-3.5 w-3.5" strokeWidth={2} />
            Theo dõi tất cả
          </button>
        )}
      </div>

      {hits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <Search className="h-5 w-5 text-quiet-on-band" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-white">Chưa có mã nào khớp tín hiệu MUA</p>
          <p className="max-w-xs text-xs leading-relaxed text-quiet-on-band">
            Hiện không cổ phiếu nào hội đủ 3 điều kiện của xu hướng tăng. Danh sách được chốt lại sau mỗi phiên đóng cửa (15:00).
          </p>
        </div>
      ) : (
        <div className="@container max-h-96 overflow-y-auto">
          {/* Sticky column header — shares COLS with every row below, and a
           * spacer the width of the row's star button, so the four labels sit
           * exactly over their values while the list scrolls. */}
          <div className="sticky top-0 z-20 flex items-center gap-2 bg-[#1a2123] px-3 py-3 text-[10px] font-semibold uppercase tracking-normal text-quiet-on-band @md:px-5 @md:tracking-[0.1em]">
            <span className="w-9 shrink-0" aria-hidden="true" />
            <div className={`grid min-w-0 flex-1 gap-1.5 @md:gap-2 ${COLS}`}>
              <span>Mã</span>
              <span>Sàn</span>
              {/* Full labels everywhere: one line when the panel is wide, two
               * lines (break before the 2nd half) when it's a narrow column. */}
              <span className="text-right leading-tight">
                Thời gian <br className="@md:hidden" />
                nắm giữ
              </span>
              <span className="text-right leading-tight">
                Lãi/lỗ <br className="@md:hidden" />
                hiện tại
              </span>
            </div>
          </div>
          {hits.map((h) => {
            const held = daysHeld(h.buyDate, sessionDate);
            const gainClass =
              h.signalReturnPercent > 0
                ? "bg-green-400/15 text-green-400"
                : h.signalReturnPercent < 0
                  ? "bg-red-400/15 text-red-300"
                  : "bg-white/10 text-quiet-on-band";
            // Entry price/date are no longer their own column — they live in
            // the row tooltip alongside the current price.
            const rowTitle = `${h.symbol}: vào tín hiệu ngày ${formatSince(h.buyDate)} ở giá ${formatPrice(h.buyPrice, h.currency)}, giá đóng cửa phiên ${formatSessionDate(sessionDate)} ${formatPrice(h.price, h.currency)}`;
            // WatchButton is its own <button> — kept as a sibling rather
            // than nested inside the row's own clickable element, since a
            // <button> (or an <a>) can't validly contain another <button>.
            const cells = (
              <>
                <span className="flex min-w-0 items-center gap-1.5 @md:gap-2">
                  {/* Logo only once the panel is wide enough to keep the symbol
                   * readable — in the narrowest side-column widths the fixed
                   * Sàn / Thời gian / Lãi-lỗ columns leave no room for it. */}
                  <span className="hidden shrink-0 @min-[22rem]:inline-flex">
                    <CompanyLogo symbol={h.symbol} size={22} fallback="space" />
                  </span>
                  <span className="truncate font-bold tracking-[0.02em] text-white">{h.symbol}</span>
                </span>
                <span className="justify-self-start bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[#d4dedc]">
                  {h.exchange}
                </span>
                <span className="justify-self-end whitespace-nowrap text-xs tabular-nums text-[#d4dedc]">
                  {held > 0 ? `${held} ngày` : "Mới vào"}
                </span>
                <span
                  className={`justify-self-end whitespace-nowrap px-1.5 py-0.5 text-xs font-bold tabular-nums ${gainClass}`}
                >
                  {formatPercent(h.signalReturnPercent)}
                </span>
              </>
            );
            const rowClass = `grid min-w-0 flex-1 items-center gap-1.5 @md:gap-2 text-left ${COLS}`;
            // Switches the sibling chart in place when one's provided
            // (Dashboard/THỰC CHIẾN CP both render this next to a chart);
            // otherwise falls back to navigating to the stock detail page.
            return (
              <div
                key={h.symbol}
                className="relative flex items-center gap-2 border-t border-white/[0.08] px-3 py-3 transition-colors duration-200 hover:bg-white/5 @md:px-5"
              >
                <WatchButton symbol={h.symbol} onDark />
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
    </div>
  );
}
