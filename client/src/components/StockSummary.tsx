import { Link } from "react-router-dom";
import Flash from "./Flash";
import AnimatedNumber from "./AnimatedNumber";
import { usePolling } from "../hooks/usePolling";
import { useMemo, useState } from "react";
import { fetchCompanyProfile, fetchFinancials, fetchHistory } from "../api/client";
import { computeTradingSignals, latestConditions, type TradingSignal } from "../utils/signals";
import { dropUnclosedBars } from "../utils/sessionClose";
import type { Quote } from "../types";
import { formatMarketCap, formatPrice, trendClass } from "../utils/format";
import { BVPS_MATCH, EPS_MATCH, findLatest, PB_MATCH, PE_MATCH } from "../utils/ratios";
import CompanyLogo from "./CompanyLogo";
import WatchButton from "./WatchButton";
import TechnicalChartPanel from "./TechnicalChartPanel";

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

const ddmm = (sec: number) =>
  new Date(sec * 1000).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

// Thẻ "Tín hiệu hiện tại": trạng thái của hệ thống ở phiên đã đóng gần nhất,
// giá/ngày mua và lãi/lỗ nếu đang giữ, và tóm tắt các lệnh đã đóng của mã. Tính từ chính lịch sử giá, chốt sau 15:00 (không thời gian thực).
function SignalCard({
  signals,
  cond,
  price,
  scale,
  fmt,
  closeAt,
}: {
  closeAt: (sec: number) => number | null;
  signals: TradingSignal[];
  cond: ReturnType<typeof latestConditions>;
  price: number;
  scale: number;
  fmt: (n: number) => string;
}) {
  if (!cond) return null;
  // Lệnh đang mở: lần "Mua 1/3" gần nhất không có "Đóng lệnh" sau nó.
  let entry: TradingSignal | null = null;
  for (const sg of signals) {
    if (sg.type === "buy" && sg.note?.startsWith("Mua 1/")) entry = sg;
    if (sg.type === "sell") entry = null;
  }
  const lastBar = cond.time;
  const isNew = entry != null && entry.time === lastBar;
  const state = entry ? (isNew ? "Mua mới" : "Đang giữ") : "Không giữ";
  const stateStyle =
    state === "Mua mới"
      ? { background: "rgba(79,209,139,0.16)", color: "var(--sm-up)" }
      : state === "Đang giữ"
        ? { background: "rgba(201,162,74,0.18)", color: "var(--sm-gold2)" }
        : { background: "rgba(239,231,212,0.08)", color: "var(--sm-mut)" };
  // Giá vào lệnh = giá đóng cửa của phiên có tín hiệu mua (hệ thống mua theo giá đóng cửa).
  const entryClose = entry ? closeAt(entry.time) : null;
  const entryPrice = entryClose != null ? entryClose * scale : null;
  const pnl = entryPrice ? (price / entryPrice - 1) * 100 : null;

  const closes = signals
    .filter((sg) => sg.type === "sell" && sg.note?.includes("Đóng lệnh"))
    .map((sg) => parseFloat((sg.note?.match(/([+-]?\d+[.,]?\d*)%/)?.[1] ?? "").replace(",", ".")))
    .filter((v) => Number.isFinite(v));
  const wins = closes.filter((v) => v > 0).length;
  const avg = closes.length ? closes.reduce((a, v) => a + v, 0) / closes.length : null;
  const pctS = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

  return (
    <div className="mb-4 border-b border-[var(--sm-line2)] pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.85rem] text-[var(--sm-mut)]">Tín hiệu hiện tại</span>
        <span className="text-[0.75rem] text-[var(--sm-mut)]">Chốt sau phiên 15:00 ngày {ddmm(lastBar)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="rounded-[3px] px-3 py-1 font-display text-[1.3rem] font-bold" style={stateStyle}>
          {state}
        </span>
        {entry && entryPrice != null && (
          <span className="text-[0.9rem] text-[var(--sm-egg2)]">
            Mua {ddmm(entry.time)} · giá {fmt(entryPrice)}
            {pnl != null && <b className={`ml-2 tabular-nums ${pnl > 0 ? "up" : pnl < 0 ? "down" : ""}`}>{pctS(pnl)}</b>}
          </span>
        )}
      </div>
      {closes.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-[3px] border border-[var(--sm-line2)] p-2 text-center">
          <div>
            <span className="block text-[0.72rem] text-[var(--sm-mut)]">Lệnh đã đóng</span>
            <b className="tabular-nums text-[var(--sm-egg)]">{closes.length}</b>
          </div>
          <div>
            <span className="block text-[0.72rem] text-[var(--sm-mut)]">Tỷ lệ thắng</span>
            <b className="tabular-nums text-[var(--sm-egg)]">{Math.round((wins / closes.length) * 100)}%</b>
          </div>
          <div>
            <span className="block text-[0.72rem] text-[var(--sm-mut)]">Lãi/lỗ TB</span>
            <b className={`tabular-nums ${avg! > 0 ? "up" : avg! < 0 ? "down" : ""}`}>{pctS(avg!)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

// Đoạn giới thiệu ngắn dưới tên công ty: vạch vàng bên trái, 2 dòng, "Xem thêm".
function AboutLine({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 max-w-[80ch] border-l-2 border-[var(--sm-gold)] pl-3">
      <p className={`text-[0.9rem] leading-relaxed text-[var(--sm-egg2)] ${open ? "" : "line-clamp-2"}`}>{text}</p>
      {text.length > 180 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-[0.82rem] font-semibold text-[var(--sm-gold2)] hover:underline">
          {open ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
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

  // Lịch sử giá ngày đầy đủ: dùng cho biểu đồ tổng quan và tín hiệu của hệ thống.
  const { data: hist } = usePolling(() => fetchHistory(symbol, "MAX"), [symbol], 10 * 60 * 1000);
  const history = useMemo(() => hist?.points ?? [], [hist]);
  const signals = useMemo(
    () => (isIndexOrFutures || history.length === 0 ? [] : computeTradingSignals(dropUnclosedBars(history)).transitions),
    [history, isIndexOrFutures]
  );
  const cond = useMemo(() => (isIndexOrFutures ? null : latestConditions(history)), [history, isIndexOrFutures]);
  const closeByDay = useMemo(() => new Map(history.map((p) => [p.time.slice(0, 10), p.close])), [history]);
  const closeAt = (sec: number) =>
    closeByDay.get(new Date(sec * 1000 + 7 * 3600_000).toISOString().slice(0, 10)) ?? closeByDay.get(new Date(sec * 1000).toISOString().slice(0, 10)) ?? null;
  // Lịch sử có thể tính bằng nghìn đồng trong khi giá khớp tính bằng đồng.
  const histScale = useMemo(() => {
    const lc = history[history.length - 1]?.close;
    if (!lc || !quote.price) return 1;
    const r = quote.price / lc;
    return r > 500 ? 1000 : r < 0.002 ? 0.001 : 1;
  }, [history, quote.price]);

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
  // Sở hữu NN hiện tại, room còn lại (% số CP niêm yết) và trần sở hữu NN đang mở
  // = đang sở hữu + room còn lại (cùng mẫu số là số CP niêm yết).
  const p2 = (v: number) => `${v.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  // KBS: FO/LS là TRẦN sở hữu NN được phép (vd ngân hàng tròn 30,00%), FR/LS là
  // room còn lại -> NN đang sở hữu = trần − room còn lại.
  const capPct = quote.foreignOwnershipPercent ?? null;
  const roomPct = quote.foreignRoomPercent ?? null;
  const ownPct = capPct != null && roomPct != null ? Math.max(0, capPct - roomPct) : null;

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
  // Khối ngoại: 4 hàng × 2 cột, đặt riêng một khung để dễ phân biệt.
  const net = quote.foreignBuyVolume != null && quote.foreignSellVolume != null ? quote.foreignBuyVolume - quote.foreignSellVolume : null;
  const foreign: [string, string | null, string?][] = [
    ["Mua", count(quote.foreignBuyVolume, "")],
    ["Bán", count(quote.foreignSellVolume, "")],
    ["Mua − bán ròng", net == null ? null : `${net > 0 ? "+" : net < 0 ? "−" : ""}${Math.abs(Math.round(net)).toLocaleString("vi-VN")}`, net == null ? undefined : net > 0 ? "up" : net < 0 ? "down" : undefined],
    ["Room tối đa", capPct != null ? p2(capPct) : null],
    ["Đang sở hữu", ownPct != null ? p2(ownPct) : null],
    ["Room còn lại (CP)", room ? room.replace(" CP", "") : null],
    ["Room còn lại (%)", roomPct != null ? p2(roomPct) : null],
  ];
  const kv: [string, string | null, boolean?][] = isIndexOrFutures
    ? [["Nguồn dữ liệu", dataSources.join(" · ") || null]]
    : [
        ["P/E (lần)", ratio(pe?.value, ""), cstcLoading && !cstc],
        ["P/B (lần)", ratio(pb?.value, ""), cstcLoading && !cstc],
        ["EPS (đồng)", perShare(eps?.value)?.replace(" Đồng/CP", "") ?? null, cstcLoading && !cstc],
        ["BVPS (đồng)", perShare(bvps?.value)?.replace(" Đồng/CP", "") ?? null, cstcLoading && !cstc],
        ["KL lưu hành", count(profile?.outstandingShares, ""), profileLoading && !profile],
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
        <div className="grid h-16 w-28 shrink-0 place-items-center self-start rounded-md bg-[#ffffff] px-2 sm:h-28 sm:w-48 sm:px-3">
          <span className="sm:hidden">
            <CompanyLogo symbol={symbol} size={44} width={96} fallback="none" />
          </span>
          <span className="hidden sm:block">
            <CompanyLogo symbol={symbol} size={72} width={156} fallback="none" />
          </span>
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
          {profile?.businessModel && <AboutLine text={profile.businessModel} />}
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
          <TechnicalChartPanel symbol={symbol} height={460} hideStats />
        </div>

        <div className="flex min-w-0 flex-col rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-4 lg:col-span-5">
          {!isIndexOrFutures && <SignalCard signals={signals} cond={cond} price={quote.price} scale={histScale} fmt={fmt} closeAt={closeAt} />}
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

          {!isIndexOrFutures && (
            <div className="mt-3 rounded-[3px] border border-[rgba(127,179,200,0.28)] bg-[rgba(127,179,200,0.05)] px-3 pt-2 pb-1">
              <p className="flex items-center gap-2 text-[0.8rem] font-semibold text-[#9cc9da]">
                <span className="h-2.5 w-[3px] rounded-full bg-[#7fb3c8]" aria-hidden="true" />
                Khối ngoại
              </p>
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {foreign.map(([label, v, cls]) => (
                  <div
                    key={label}
                    className={`flex min-h-9 items-center justify-between gap-3 border-b border-[var(--sm-line2)] last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0 ${label === "Mua − bán ròng" ? "sm:col-span-2" : ""}`}
                  >
                    <dt className="text-[0.86rem] text-[var(--sm-mut)]">{label}</dt>
                    <dd className={`text-right text-[0.93rem] font-semibold tabular-nums ${cls ?? "text-[var(--sm-egg)]"}`}>
                      {v ?? <span className="text-[var(--sm-mut)]">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <dl className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {kv.map(([label, v, l]) => (
              <div
                key={label}
                className={`flex min-h-10 items-center justify-between gap-3 border-b border-[var(--sm-line2)] ${label === "KL lưu hành" ? "sm:col-span-2" : ""}`}
              >
                <dt className="text-[0.88rem] text-[var(--sm-mut)]">{label}</dt>
                <dd className="text-right text-[0.95rem] font-semibold tabular-nums text-[var(--sm-egg)]">
                  {v ?? (l ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-[var(--ab-skel)]" /> : <span className="text-[var(--sm-mut)]">—</span>)}
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
