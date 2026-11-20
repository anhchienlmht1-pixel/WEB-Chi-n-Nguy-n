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
import PriceOverviewChart from "./PriceOverviewChart";

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

// Giá trần/sàn theo biên độ của sàn (HOSE ±7%, HNX ±10%, UPCoM ±15%), làm tròn
// theo bước giá: trần làm tròn xuống, sàn làm tròn lên. Chỉ tính khi giá tính
// bằng đồng (VND) và có giá tham chiếu.
function limits(ref: number, exchange: string): { ceil: number; floor: number } | null {
  const ex = exchange.toUpperCase();
  const band = ex.includes("HOSE") || ex.includes("HSX") ? 0.07 : ex.includes("HNX") ? 0.1 : ex.includes("UPCOM") ? 0.15 : null;
  if (band == null || !(ref > 0)) return null;
  const tick = (v: number) => (ex.includes("HOSE") || ex.includes("HSX") ? (v < 10000 ? 10 : v < 50000 ? 50 : 100) : 100);
  const c = ref * (1 + band);
  const f = ref * (1 - band);
  return { ceil: Math.floor(c / tick(c)) * tick(c), floor: Math.ceil(f / tick(f)) * tick(f) };
}

// Ô giá kiểu bảng điện: nhãn nhỏ, số màu theo quy ước (tham chiếu vàng, trần tím,
// sàn xanh lơ, cao hơn tham chiếu xanh lá, thấp hơn đỏ).
function BoardCell({ label, value, color }: { label: string; value: string | null; color: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1 py-2.5">
      <span className="text-[0.78rem] text-[var(--sm-mut)]">{label}</span>
      <b className="mt-0.5 text-[0.98rem] tabular-nums" style={{ color }}>
        {value ?? "—"}
      </b>
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

  // Bố cục tổng quan: đầu trang (logo, tên, mã, giá, ngành), bên trái biểu đồ
  // giá + % thay đổi theo khung thời gian, bên phải bảng số liệu phiên và định
  // giá. Màu số theo quy ước bảng điện Việt Nam.
  const ref = quote.prevClose;
  const lim = !isIndexOrFutures && quote.currency === "VND" ? limits(ref, quote.exchange || "") : null;
  const REF = "#e6c34a";
  const CEIL = "#d27bff";
  const FLOOR = "#4fc3f7";
  const vsRef = (v: number) => (!(ref > 0) || v === ref ? REF : v > ref ? "var(--sm-up)" : "var(--sm-dn)");
  const priceColor = lim && quote.price >= lim.ceil ? CEIL : lim && quote.price <= lim.floor ? FLOOR : vsRef(quote.price);
  const pctTxt = `${quote.changePercent > 0 ? "+" : quote.changePercent < 0 ? "−" : ""}${Math.abs(quote.changePercent).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const updated = new Date(quote.updatedAt);
  const stat = (label: string, value: string | null) => (
    <div className="min-w-0">
      <span className="block text-[0.8rem] text-[var(--sm-mut)]">{label}</span>
      <b className="mt-0.5 block truncate font-display text-[1.35rem] leading-tight tabular-nums text-[var(--sm-egg)]">{value ?? "—"}</b>
    </div>
  );
  const kv: [string, string | null, boolean?][] = isIndexOrFutures
    ? [["Nguồn dữ liệu", dataSources.join(" · ") || null]]
    : [
        ["NN mua", count(quote.foreignBuyVolume, "")],
        ["NN bán", count(quote.foreignSellVolume, "")],
        ["KL lưu hành", count(profile?.outstandingShares, ""), profileLoading && !profile],
        ["Room NN còn lại", room],
        ["P/E (lần)", ratio(pe?.value, ""), cstcLoading && !cstc],
        ["P/B (lần)", ratio(pb?.value, ""), cstcLoading && !cstc],
        ["EPS (đồng)", perShare(eps?.value)?.replace(" Đồng/CP", "") ?? null, cstcLoading && !cstc],
        ["BVPS (đồng)", perShare(bvps?.value)?.replace(" Đồng/CP", "") ?? null, cstcLoading && !cstc],
      ];

  return (
    <div className="mb-8">
      <nav aria-label="Đường dẫn" className="text-[0.92rem] text-[var(--sm-mut)]">
        <Link to="/tin-hieu" className="hover:text-[var(--sm-egg)]">
          Tín hiệu
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--sm-egg2)]">{symbol}</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-[var(--sm-line)] bg-[#efe7d4] sm:h-24 sm:w-24">
          <CompanyLogo symbol={symbol} size={56} fallback="none" />
        </div>
        <div className="min-w-0 flex-1">
          {quote.name && quote.name !== symbol && <p className="truncate text-[1.1rem] text-[var(--sm-egg2)]">{quote.name}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="rounded-[3px] border border-[rgba(201,162,74,0.55)] px-3 py-0.5 font-display text-[1.7rem] leading-tight text-[var(--sm-egg)]">
              {symbol}
            </h1>
            {quote.exchange && <span className="text-[1.05rem] font-semibold text-[var(--sm-egg2)]">{quote.exchange}</span>}
            <WatchButton symbol={symbol} />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[clamp(2.2rem,4.5vw,3rem)] font-bold leading-none tabular-nums" style={{ color: priceColor }}>
              <Flash value={quote.price}>
                <AnimatedNumber value={quote.price} format={fmt} />
              </Flash>
            </span>
            <span className={`text-[1.15rem] font-semibold tabular-nums ${tone}`}>
              {arrow} {quote.change > 0 ? "+" : quote.change < 0 ? "−" : ""}
              {fmt(Math.abs(quote.change))}
            </span>
            <span
              className={`rounded-[3px] px-2 py-0.5 text-[1.05rem] font-semibold tabular-nums ${tone}`}
              style={{ background: quote.change > 0 ? "rgba(79,209,139,0.14)" : quote.change < 0 ? "rgba(255,107,94,0.14)" : "rgba(239,231,212,0.08)" }}
            >
              {pctTxt}
            </span>
            <span className="text-[0.88rem] text-[var(--sm-mut)]">
              {updated.toLocaleDateString("vi-VN")} {updated.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {(quote.sector || website) && (
            <p className="mt-2 text-[0.92rem] text-[var(--sm-mut)]">
              {quote.sector && (
                <>
                  Ngành: <span className="text-[var(--sm-egg2)]">{quote.sector}</span>
                </>
              )}
              {quote.sector && website && <span className="mx-2">·</span>}
              {website && (
                <a href={websiteHref(website)} target="_blank" rel="noopener noreferrer" className="text-[var(--sm-gold2)] hover:underline">
                  {websiteLabel(website)}
                </a>
              )}
            </p>
          )}
        </div>
      </header>

      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <PriceOverviewChart symbol={symbol} prevClose={quote.prevClose} price={quote.price} fmt={fmt} />
        </div>

        <div className="flex min-w-0 flex-col rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-4 lg:col-span-5">
          <div className="grid grid-cols-2 gap-4 border-b border-[var(--sm-line2)] pb-4">
            {stat("Khối lượng", count(quote.volume, ""))}
            {isIndexOrFutures
              ? stat("Giá trị", quote.value ? `${Math.round(quote.value / 1e9).toLocaleString("vi-VN")} tỷ` : null)
              : stat("Vốn hóa", marketCap ? marketCap.replace(" Tỷ", " tỷ") : null)}
          </div>

          <div className={`mt-3 grid rounded-[3px] border border-[var(--sm-line2)] bg-[rgba(0,0,0,0.12)] ${lim ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-4"}`}>
            <BoardCell label="T.chiếu" value={ref > 0 ? fmt(ref) : null} color={REF} />
            <BoardCell label="Mở cửa" value={quote.open > 0 ? fmt(quote.open) : null} color={vsRef(quote.open)} />
            {lim && <BoardCell label="Trần" value={fmt(lim.ceil)} color={CEIL} />}
            {lim && <BoardCell label="Sàn" value={fmt(lim.floor)} color={FLOOR} />}
            <BoardCell label="Cao" value={quote.high > 0 ? fmt(quote.high) : null} color={vsRef(quote.high)} />
            <BoardCell label="Thấp" value={quote.low > 0 ? fmt(quote.low) : null} color={vsRef(quote.low)} />
          </div>

          <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {kv
              .filter(([, v, l]) => v != null || l)
              .map(([label, v, l]) => (
                <div key={label} className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--sm-line2)]">
                  <dt className="text-[0.88rem] text-[var(--sm-mut)]">{label}</dt>
                  <dd className="text-right text-[0.95rem] font-semibold tabular-nums text-[var(--sm-egg)]">
                    {v ?? <span className="inline-block h-4 w-16 animate-pulse rounded bg-[var(--ab-skel)]" />}
                  </dd>
                </div>
              ))}
          </dl>

          {!isIndexOrFutures && dataSources.length > 0 && (
            <p className="mt-auto pt-3 text-[0.75rem] text-[var(--sm-mut)]">Nguồn: {dataSources.join(" · ")}. P/E, P/B, EPS, BVPS theo báo cáo quý gần nhất.</p>
          )}
        </div>
      </div>
    </div>
  );
}
