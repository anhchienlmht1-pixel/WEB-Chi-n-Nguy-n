import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Flash from "./Flash";
import AnimatedNumber from "./AnimatedNumber";
import { usePolling } from "../hooks/usePolling";
import { fetchCompanyProfile, fetchFinancials } from "../api/client";
import type { Quote } from "../types";
import { formatMarketCap, formatPrice, trendClass } from "../utils/format";
import { BVPS_MATCH, EPS_MATCH, findLatest, PB_MATCH, PE_MATCH } from "../utils/ratios";
import CompanyLogo from "./CompanyLogo";
import WatchButton from "./WatchButton";

// Every number here is read straight from the quote, the company profile or the
// company's own CSTC (financial ratios) report. A row whose figure the data
// sources don't have is left out rather than filled with a placeholder — there
// is no scoring or ranking of our own on this card.

const SOURCE_LABEL: Record<string, string> = {
  kbs: "KBS",
  vndirect: "VNDirect",
  vci: "VCI",
  vnstock: "vnstock",
  cafef: "CafeF",
  tradingview: "TradingView",
};

function sourceLabel(s: string | undefined): string | null {
  if (!s) return null;
  return SOURCE_LABEL[s.toLowerCase()] ?? s;
}

function count(n: number | null | undefined, unit: string): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  return `${Math.round(n).toLocaleString("vi-VN")} ${unit}`;
}

function ratio(n: number | null | undefined, unit: string): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${n.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
}

function perShare(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${Math.round(n).toLocaleString("vi-VN")} Đồng/CP`;
}

function websiteHref(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function websiteLabel(raw: string): string {
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
}

// One "label ........ value" line. No value -> no row; `loading` shows a
// placeholder bar instead so the card doesn't jump when the slower sources land.
function Row({ label, value, title, loading }: { label: string; value?: ReactNode | null; title?: string; loading?: boolean }) {
  if (!loading && (value == null || value === "")) return null;
  return (
    <div
      title={title}
      className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--sm-line2)] px-5 text-[0.92rem] last:border-b-0"
    >
      <span className="shrink-0 text-[var(--sm-mut)]">{label}</span>
      {value == null || value === "" ? (
        <span className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      ) : (
        <span className="min-w-0 text-right font-semibold tabular-nums text-[var(--sm-egg)]">{value}</span>
      )}
    </div>
  );
}

// Where the price sits between the session's low and high.
function DayRange({ quote, fmt }: { quote: Quote; fmt: (n: number) => string }) {
  const { low, high, price } = quote;
  if (!(high > 0) || !(low > 0) || high < low) return null;
  const pct = high === low ? 50 : Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
  return (
    <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3 text-xs">
      <div>
        <div className="text-slate-500 dark:text-slate-400">Giá thấp nhất</div>
        <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {fmt(low)}
        </div>
      </div>
      <div
        className="relative mb-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"
        role="img"
        aria-label={`Giá hiện tại nằm ở ${Math.round(pct)}% khoảng thấp nhất–cao nhất của phiên`}
      >
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow dark:border-slate-900"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="text-right">
        <div className="text-slate-500 dark:text-slate-400">Giá cao nhất</div>
        <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {fmt(high)}
        </div>
      </div>
    </div>
  );
}

// Header card of the stock page: identity on the left, company figures in the
// middle, live price and valuation on the right.
export default function StockSummary({ quote, isIndexOrFutures }: { quote: Quote; isIndexOrFutures: boolean }) {
  const symbol = quote.symbol;

  // Profile + ratios are secondary: a failure just means those rows are absent.
  const { data: profile, loading: profileLoading } = usePolling(
    () => (isIndexOrFutures ? Promise.resolve(null) : fetchCompanyProfile(symbol).catch(() => null)),
    [symbol, isIndexOrFutures]
  );
  const { data: cstc, loading: cstcLoading } = usePolling(
    () => (isIndexOrFutures ? Promise.resolve(null) : fetchFinancials(symbol, "CSTC", "quarter").catch(() => null)),
    [symbol, isIndexOrFutures],
    6 * 60 * 60 * 1000
  );

  const pe = cstc ? findLatest(cstc, PE_MATCH) : null;
  const pb = cstc ? findLatest(cstc, PB_MATCH) : null;
  const eps = cstc ? findLatest(cstc, EPS_MATCH) : null;
  const bvps = cstc ? findLatest(cstc, BVPS_MATCH) : null;

  // Index levels (1.650,32) need their decimals; share prices are whole dong.
  const fmt = (n: number) =>
    isIndexOrFutures
      ? n.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : formatPrice(n, quote.currency);
  const tone = trendClass(quote.change);
  const arrow = quote.change > 0 ? "▲" : quote.change < 0 ? "▼" : "■";
  const website = profile?.website?.trim() || null;
  // One name when every part came from the same provider, otherwise say which
  // part came from where.
  const sourceParts = [
    { what: "Giá", name: sourceLabel(quote.source) },
    { what: "Tài chính", name: sourceLabel(cstc?.source) },
    { what: "Hồ sơ", name: profile ? sourceLabel(profile.source) : null },
  ].filter((p): p is { what: string; name: string } => Boolean(p.name));
  const distinctSources = new Set(sourceParts.map((p) => p.name));
  const dataSources =
    distinctSources.size === 1
      ? [sourceParts[0].name]
      : sourceParts.map((p) => `${p.what}: ${p.name}`);

  const marketCap =
    quote.marketCap && quote.marketCap > 0
      ? quote.currency === "VND"
        ? `${Math.round(quote.marketCap / 1e9).toLocaleString("vi-VN")} Tỷ`
        : formatMarketCap(quote.marketCap, quote.currency)
      : null;
  const room = count(quote.foreignRoom, "CP");
  const showMiddle = !isIndexOrFutures;

  const sessionRows = [
    { label: "Giá mở cửa", value: quote.open > 0 ? fmt(quote.open) : null },
    { label: "Giá tham chiếu", value: quote.prevClose > 0 ? fmt(quote.prevClose) : null },
    { label: "NN mua", value: count(quote.foreignBuyVolume, "CP") },
    { label: "NN bán", value: count(quote.foreignSellVolume, "CP") },
  ].filter((r): r is { label: string; value: string } => r.value !== null);

  // Bố cục Sơn mài: đường dẫn, mã lớn + tên công ty bên trái, giá lớn bên
  // phải; bên dưới là bảng số liệu phiên, doanh nghiệp và định giá.
  return (
    <div className="mb-8">
      <nav aria-label="Đường dẫn" className="text-[0.92rem] text-[var(--sm-mut)]">
        <Link to="/tin-hieu" className="hover:text-[var(--sm-egg)]">
          Tín hiệu
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--sm-egg2)]">{symbol}</span>
      </nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <CompanyLogo symbol={symbol} size={44} fallback="none" />
            <h1 className="font-display text-[clamp(2.6rem,5vw,3.5rem)] leading-none text-[var(--sm-egg)]">{symbol}</h1>
            {quote.exchange && (
              <span className="rounded-[2px] border border-[var(--sm-gold)] px-2 py-0.5 text-[0.8rem] font-semibold text-[var(--sm-gold2)]">
                {quote.exchange}
              </span>
            )}
            <WatchButton symbol={symbol} />
          </div>
          {quote.name && quote.name !== symbol && <p className="mt-2 text-[1.05rem] leading-snug text-[var(--sm-egg2)]">{quote.name}</p>}
          {website && (
            <p className="mt-1 truncate text-sm text-[var(--sm-mut)]">
              Website:{" "}
              <a href={websiteHref(website)} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--sm-gold2)] hover:underline">
                {websiteLabel(website)}
              </a>
            </p>
          )}
        </div>
        <div className="min-w-[240px] text-left sm:text-right">
          <div className={`font-display text-[clamp(2.6rem,5vw,3.5rem)] font-bold leading-none tabular-nums ${tone}`}>
            <Flash value={quote.price}>
              <AnimatedNumber value={quote.price} format={fmt} />
            </Flash>
          </div>
          <div className={`mt-2 text-base font-semibold tabular-nums ${tone}`}>
            {arrow} {fmt(Math.abs(quote.change))} ({Math.abs(quote.changePercent).toFixed(2)}%)
          </div>
          <DayRange quote={quote} fmt={fmt} />
        </div>
      </div>

      <div
        className={`mt-6 grid overflow-hidden rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] sm:grid-cols-2 ${
          showMiddle ? "lg:grid-cols-3" : ""
        } [&>div]:border-[var(--sm-line)] sm:[&>div+div]:border-l`}
      >
        <div>
          {sessionRows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
        {showMiddle && (
          <div className="border-t sm:border-t-0">
            <Row label="Vốn hóa" value={marketCap} />
            <Row label="SLCP lưu hành" value={count(profile?.outstandingShares, "CP")} loading={profileLoading && !profile} />
            <Row label="Room NĐTNN" value={room} />
            <Row label="Nguồn dữ liệu" value={dataSources.join(" · ") || null} />
          </div>
        )}
        <div className="border-t lg:border-t-0">
          <Row label="Khối lượng khớp lệnh" value={count(quote.volume, "CP")} />
          {!isIndexOrFutures && (
            <>
              <Row label="P/B" value={ratio(pb?.value, "Lần")} title="Theo báo cáo tài chính quý gần nhất" loading={cstcLoading && !cstc} />
              <Row label="P/E" value={ratio(pe?.value, "Lần")} title="Theo báo cáo tài chính quý gần nhất" loading={cstcLoading && !cstc} />
              <Row label="EPS" value={perShare(eps?.value)} title="Theo báo cáo tài chính quý gần nhất" loading={cstcLoading && !cstc} />
              <Row label="BVPS" value={perShare(bvps?.value)} title="Theo báo cáo tài chính quý gần nhất" loading={cstcLoading && !cstc} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
