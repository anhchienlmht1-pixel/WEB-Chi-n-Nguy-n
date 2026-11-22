import { useState } from "react";
import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import {
  fetchHistory,
  fetchTradeJournal,
  fetchTrendBuyResult,
  type JournalClosedTrade,
  type TradeJournal,
  type TrendBuyResult,
  type TrendBuySignal,
} from "../api/client";
import { formatPrice } from "../utils/format";
import type { Quote } from "../types";
import { BANKS } from "../data/bankSector";
import { PROFIT } from "../data/bankValuation";

// Trang chủ theo bố cục Sơn mài: mở đầu chữ 7 cột trên nền bảng điện, dải 4 chỉ số hiệu suất, rồi Danh mục đang giữ (8 cột) cạnh Nhật ký
// đóng lệnh (4 cột). Số liệu: cùng bộ quét tín hiệu và nhật ký lệnh thật trên
// server như trước, không thêm nguồn mới.

const POLL_MS = 5 * 60 * 1000;

const day = (iso: string) => iso.slice(0, 10);
export function dm(iso: string): string {
  const [, m, d] = day(iso).split("-");
  return d && m ? `${d}/${m}` : iso;
}
export function dmy(iso: string): string {
  const [y, m, d] = day(iso).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}
export function pct(n: number, digits = 1): string {
  const s = Math.abs(n).toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n < 0 ? "−" : n > 0 ? "+" : ""}${s}%`;
}
const tone = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "");
const num = (n: number, d = 0) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });

export function useSignalData() {
  const { data: scan } = usePolling(() => fetchTrendBuyResult(), [], POLL_MS);
  const { data: journal } = usePolling(() => fetchTradeJournal(), [], POLL_MS);
  return { scan, journal };
}

// Đường giá đóng cửa 1 tháng (giá thật, tải riêng từng mã).
function Spark({ symbol, up }: { symbol: string; up: boolean }) {
  const { data } = usePolling(() => fetchHistory(symbol, "1M"), [symbol]);
  const pts = (data?.points ?? []).map((p) => p.close).filter((v) => Number.isFinite(v));
  if (pts.length < 2) return <span className="ml-auto block h-7 w-20" aria-hidden="true" />;
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const xy = pts.map((v, i) => `${((i / (pts.length - 1)) * 80).toFixed(1)},${(26 - ((v - mn) / (mx - mn || 1)) * 24).toFixed(1)}`).join(" ");
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" aria-hidden="true" className="ml-auto block">
      <polyline points={xy} fill="none" style={{ stroke: up ? "var(--sm-up)" : "var(--sm-dn)" }} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- Mở đầu */

export function SonMaiHero() {
  return (
    <section className="grid gap-x-6 gap-y-10 pt-14 pb-10 lg:grid-cols-12 lg:pt-24 lg:pb-16">
      <div className="lg:col-span-7">
        <h1 className="text-[clamp(2.4rem,5.2vw,4.1rem)] leading-[1.1] text-[var(--sm-egg)]">
          Kỷ luật theo xu hướng, giữ đến khi xu hướng gãy.
        </h1>
        <div className="my-7 h-px w-24 bg-[var(--sm-gold)]" />
        <p className="max-w-[36rem] text-[1.2rem] leading-relaxed text-[var(--sm-egg2)]">
          Hệ thống tín hiệu theo xu hướng của chuyên viên Nguyễn Anh Chiến, kèm nhật ký lệnh công khai, lãi cũng như lỗ. Cập nhật sau 15:00 mỗi
          ngày giao dịch.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#danh-muc" className="sm-btn sm-btn-p">
            Xem tín hiệu hôm nay
          </a>
          <a href="#nhat-ky" className="sm-btn">
            Xem nhật ký lệnh
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- Dải chỉ số hiệu suất */

export function SonMaiKpis({ journal }: { journal?: TradeJournal | null }) {
  if (!journal) return <div aria-busy="true" className="h-[150px] border-y border-[var(--sm-line)]" />;
  const t = journal.closed;
  const n = t.length;
  const wins = t.filter((x) => x.returnPercent > 0);
  const losses = t.filter((x) => x.returnPercent < 0);
  const avg = (xs: JournalClosedTrade[]) => (xs.length ? xs.reduce((a, x) => a + x.returnPercent, 0) / xs.length : 0);
  const holds = t.map((x) => x.holdingDays);
  const avgHold = n ? holds.reduce((a, v) => a + v, 0) / n : 0;
  const items: [string, string, string, string][] = [
    ["Tỷ lệ lệnh thắng", n ? `${num((wins.length / n) * 100)}%` : "—", `${wins.length}/${n} lệnh đã đóng`, ""],
    ["Lãi/lỗ trung bình mỗi lệnh", n ? pct(avg(t)) : "—", `Thắng TB ${pct(avg(wins))} · thua TB ${pct(avg(losses))}`, n ? tone(avg(t)) : ""],
    ["Thời gian giữ trung bình", n ? `${num(avgHold)} ngày` : "—", n ? `Ngắn nhất ${Math.min(...holds)}, dài nhất ${Math.max(...holds)}` : "", ""],
    ["Lệnh đã đóng", String(n), `Từ ${dmy(journal.startDate)}`, ""],
  ];
  return (
    <section aria-label="Hiệu suất hệ thống" className="grid grid-cols-2 border-y border-[var(--sm-line)] lg:grid-cols-4">
      {items.map(([l, v, d, cls], i) => (
        <div
          key={l}
          className={`py-6 ${i % 2 ? "pl-6 border-l border-[var(--sm-line)]" : "pr-6"} lg:px-6 lg:first:pl-0 ${i ? "lg:border-l lg:border-[var(--sm-line)]" : ""} ${i > 1 ? "border-t border-[var(--sm-line)] lg:border-t-0" : ""}`}
        >
          <p className="text-[0.95rem] text-[var(--sm-mut)]">{l}</p>
          <p className={`mt-2 font-display text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.1] font-bold ${cls ? cls : "text-[var(--sm-egg)]"}`}>{v}</p>
          <p className="mt-2 text-[0.85rem] text-[var(--sm-mut)]">{d}</p>
        </div>
      ))}
    </section>
  );
}

/* --------------------------------------------- Danh mục đang giữ + nhật ký */

type Filter = "Tất cả" | "Mua mới" | "Đang giữ";

const TH = "h-10 whitespace-nowrap px-3 text-left text-[0.85rem] font-semibold text-[var(--sm-gold2)]";
const TD = "border-t border-[var(--sm-line2)] px-3";

export function SonMaiHoldings({ scan, onPick }: { scan?: TrendBuyResult | null; onPick?: (s: string) => void }) {
  const [f, setF] = useState<Filter>("Tất cả");
  const session = scan?.sessionDate ?? "";
  const items: TrendBuySignal[] = scan?.items ?? [];
  const isNew = (h: TrendBuySignal) => day(h.buyDate) === session;
  const shown = items
    .filter((h) => (f === "Tất cả" ? true : f === "Mua mới" ? isNew(h) : !isNew(h)))
    .sort((a, b) => (a.buyDate < b.buyDate ? 1 : -1));
  return (
    <div id="danh-muc" className="min-w-0 scroll-mt-28">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.75rem] leading-tight">Danh mục đang giữ</h2>
        <div role="group" aria-label="Lọc danh mục" className="inline-flex border border-[var(--sm-line)] text-[0.9rem]">
          {(["Tất cả", "Mua mới", "Đang giữ"] as Filter[]).map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={f === x}
              onClick={() => setF(x)}
              className={`min-h-9 px-4 ${f === x ? "bg-[var(--sm-gold)] font-semibold text-[#1b1608]" : "text-[var(--sm-mut)] hover:text-[var(--sm-egg)]"}`}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-2">
        <table className="w-full min-w-[720px] border-collapse text-[0.98rem]">
          <thead>
            <tr className="border-b border-[rgba(201,162,74,0.35)]">
              <th className={TH}>Mã</th>
              <th className={TH}>Ngành</th>
              <th className={TH}>Trạng thái</th>
              <th className={`${TH} text-right`}>Ngày mua</th>
              <th className={`${TH} text-right`}>Giá mua</th>
              <th className={`${TH} text-right`}>Giá hiện tại</th>
              <th className={`${TH} text-right`}>Lãi/lỗ</th>
              <th className={`${TH} text-right`}>1 tháng</th>
            </tr>
          </thead>
          <tbody>
            {!scan ? (
              <tr>
                <td colSpan={8} className={`${TD} h-24 text-center text-[var(--sm-mut)]`}>
                  Đang tải danh mục…
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={8} className={`${TD} h-24 text-center text-[var(--sm-mut)]`}>
                  {f === "Mua mới" ? "Phiên gần nhất không có mã mua mới." : "Chưa có mã nào trong danh mục."}
                </td>
              </tr>
            ) : (
              shown.map((h) => (
                <tr
                  key={h.symbol}
                  className="cursor-pointer transition-colors hover:bg-[rgba(201,162,74,0.06)]"
                  onClick={() => onPick?.(h.symbol)}
                  title={`Xem biểu đồ ${h.symbol}`}
                >
                  <td className={`${TD} py-2`}>
                    <Link to={`/stock/${h.symbol}`} onClick={(e) => e.stopPropagation()} className="block font-semibold leading-tight text-[var(--sm-egg)] hover:underline">
                      {h.symbol}
                    </Link>
                    <span className="mt-0.5 block max-w-[11rem] truncate text-[0.8rem] leading-tight text-[var(--sm-mut)]">
                      {h.name && h.name !== h.symbol ? h.name : h.exchange}
                    </span>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-[0.9rem] text-[var(--sm-mut)]`}>{h.sector ?? "—"}</td>
                  <td className={TD}>
                    <span
                      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[0.8rem] font-semibold ${
                        isNew(h) ? "bg-[rgba(79,209,139,0.14)] text-[var(--sm-up)]" : "bg-[rgba(201,162,74,0.16)] text-[var(--sm-gold2)]"
                      }`}
                    >
                      {isNew(h) ? "Mua mới" : "Đang giữ"}
                    </span>
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{dm(h.buyDate)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{formatPrice(h.buyPrice, h.currency)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{formatPrice(h.price, h.currency)}</td>
                  <td className={`${TD} text-right tabular-nums ${tone(h.signalReturnPercent)}`}>{pct(h.signalReturnPercent)}</td>
                  <td className={`${TD} py-2`}>
                    <Spark symbol={h.symbol} up={h.signalReturnPercent >= 0} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.82rem] text-[var(--sm-mut)]">Bấm vào một dòng để xem biểu đồ mã đó ở bên dưới; bấm vào mã để mở trang chi tiết.</p>
    </div>
  );
}

export function SonMaiJournal({ journal }: { journal?: TradeJournal | null }) {
  const [all, setAll] = useState(false);
  const closed = [...(journal?.closed ?? [])].sort((a, b) => (a.sellDate < b.sellDate ? 1 : -1));
  const list = all ? closed : closed.slice(0, 6);
  return (
    <div id="nhat-ky" className="min-w-0 scroll-mt-28">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[1.75rem] leading-tight">Nhật ký đóng lệnh</h2>
        {closed.length > 6 && (
          <button type="button" onClick={() => setAll((v) => !v)} className="min-h-9 text-[0.92rem] text-[var(--sm-gold2)] hover:underline">
            {all ? "Thu gọn" : `Xem tất cả (${closed.length})`}
          </button>
        )}
      </div>
      <div className="rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-2">
        <table className="w-full border-collapse text-[0.98rem]">
          <thead>
            <tr className="border-b border-[rgba(201,162,74,0.35)]">
              <th className={TH}>Mã</th>
              <th className={`${TH} text-right`}>Mua</th>
              <th className={`${TH} text-right`}>Đóng</th>
              <th className={`${TH} text-right`}>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {!journal ? (
              <tr>
                <td colSpan={4} className={`${TD} h-24 text-center text-[var(--sm-mut)]`}>
                  Đang tải…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${TD} h-24 text-center text-[var(--sm-mut)]`}>
                  Chưa có lệnh nào đóng.
                </td>
              </tr>
            ) : (
              list.map((t) => (
                <tr key={t.symbol + t.sellDate} title={`${t.symbol}: mua ${dmy(t.buyDate)}, đóng ${dmy(t.sellDate)}, giữ ${t.holdingDays} ngày`}>
                  <td className={`${TD} h-[52px]`}>
                    <Link to={`/stock/${t.symbol}`} className="font-semibold text-[var(--sm-egg)] hover:underline">
                      {t.symbol}
                    </Link>
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{dm(t.buyDate)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{dm(t.sellDate)}</td>
                  <td className={`${TD} text-right tabular-nums ${tone(t.returnPercent)}`}>{pct(t.returnPercent)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.82rem] text-[var(--sm-mut)]">Đóng lệnh khi SMA20 cắt xuống SMA50 hoặc Supertrend đảo chiều. Lãi/lỗ tính trên giá đóng cửa, chưa trừ phí và thuế.</p>
    </div>
  );
}

/* ------------------------------------------------------------- Insight đầu trang */

const sma = (xs: number[], n: number) => (xs.length >= n ? xs.slice(-n).reduce((a, v) => a + v, 0) / n : NaN);

export function InsightCard({ to, label, value, cls, sub, foot }: { to: string; label: string; value: string; cls?: string; sub: string; foot: string }) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-3.5 transition-colors sm:p-5 hover:border-[rgba(201,162,74,0.55)]"
    >
      <span className="text-[0.78rem] text-[var(--sm-mut)] sm:text-[0.85rem]">{label}</span>
      <b className={`mt-1.5 font-display text-[1.2rem] leading-[1.15] sm:mt-2 sm:text-[1.75rem] ${cls || "text-[var(--sm-egg)]"}`}>{value}</b>
      <span className="mt-1.5 text-[0.78rem] leading-snug text-[var(--sm-egg2)] sm:mt-2 sm:text-[0.88rem]">{sub}</span>
      <span className="mt-auto hidden pt-3 text-[0.78rem] text-[var(--sm-mut)] group-hover:text-[var(--sm-gold2)] sm:block">{foot}</span>
    </Link>
  );
}

// Dải "Insight trên Bull Stock": các mảng dữ liệu chính của web, mỗi thẻ kèm
// số liệu sống và dẫn tới trang tương ứng: xu hướng VN-Index (SMA20/50 từ giá đóng cửa), độ rộng
// thị trường (số mã tăng/giảm của chỉ số), báo cáo tài chính ngân hàng Q3/2026
// và hiệu suất hệ thống tín hiệu. Chỉ mô tả trạng thái, không dự báo.
// Xu hướng VN-Index theo giá đóng cửa: trên/dưới SMA20, SMA50. Chỉ mô tả trạng thái.
export function useMarketTrend() {
  const { data: hist } = usePolling(() => fetchHistory("VNINDEX", "6M"), [], POLL_MS);
  const closes = (hist?.points ?? []).map((p) => p.close).filter((v) => Number.isFinite(v));
  const last = closes[closes.length - 1];
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  let trend = "—";
  let trendCls = "";
  let trendSub = "Đang tải dữ liệu giá…";
  if (Number.isFinite(last) && Number.isFinite(s50)) {
    const above20 = last > s20;
    const above50 = last > s50;
    trend = above20 && above50 && s20 > s50 ? "Xu hướng tăng" : !above20 && !above50 && s20 < s50 ? "Xu hướng giảm" : "Đi ngang";
    trendCls = trend === "Xu hướng tăng" ? "up" : trend === "Xu hướng giảm" ? "down" : "";
    trendSub = `${num(last, 2)} điểm · ${above20 ? "trên" : "dưới"} SMA20 (${num(s20, 0)}), ${above50 ? "trên" : "dưới"} SMA50 (${num(s50, 0)})`;
  }

  return { trend, trendCls, trendSub, last, s20, s50 };
}

export function SonMaiInsights({ quotes, scan, journal }: { quotes?: Quote[]; scan?: TrendBuyResult | null; journal?: TradeJournal | null }) {
  const { trend, trendCls, trendSub } = useMarketTrend();
  const vni = quotes?.find((q) => q.symbol === "VNINDEX");
  const adv = vni?.advances;
  const dec = vni?.declines;
  const flat = vni?.noChanges ?? 0;

  const pbt = BANKS.map((b) => PROFIT[b.bank]).filter(Boolean);
  const pbtNow = pbt.reduce((a, p) => a + p!.pbt, 0);
  const pbtPrev = pbt.reduce((a, p) => a + p!.pbtPrev, 0);
  const pbtYoy = pbtPrev ? (pbtNow / pbtPrev - 1) * 100 : 0;
  const upBanks = pbt.filter((p) => p!.pbt > p!.pbtPrev).length;
  const roes = BANKS.map((b) => b.v.roe).filter((v): v is number => v != null);
  const roeAvg = roes.length ? roes.reduce((a, v) => a + v, 0) / roes.length : 0;

  const t = journal?.closed ?? [];
  const wins = t.filter((x) => x.returnPercent > 0).length;

  const sample = scan?.items[0]?.symbol ?? "HPG";
  return (
    <section aria-label="Insight trên Bull Stock" className="pt-8">
      <h2 className="text-[1.35rem] leading-tight">Insight trên Bull Stock</h2>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <InsightCard
          to="/stock/VNINDEX"
          label="Chỉ báo xu hướng thị trường"
          value={trend}
          cls={trendCls}
          sub={adv != null && dec != null ? `${trendSub} · ${adv} mã tăng, ${dec} mã giảm, ${flat} đứng giá` : trendSub}
          foot="VN-Index theo SMA20, SMA50 và độ rộng thị trường"
        />
        <InsightCard
          to={`/stock/${sample}`}
          label="Dữ liệu báo cáo tài chính doanh nghiệp"
          value="Theo từng quý"
          sub="Doanh thu, lợi nhuận, biên lợi nhuận, P/E, P/B, EPS của từng mã, cập nhật theo báo cáo mới nhất"
          foot={`Xem ví dụ: ${sample}`}
        />
        <InsightCard
          to="/nganh-ngan-hang"
          label="Ngành ngân hàng Q3/2026"
          value={`LNTT ${pct(pbtYoy)}`}
          cls={tone(pbtYoy)}
          sub={`${num(pbtNow / 1000, 1)} nghìn tỷ · ${upBanks}/${pbt.length} ngân hàng tăng lợi nhuận · ROE TB ${num(roeAvg, 1)}%`}
          foot="16 ngân hàng: chỉ số, định giá, quy mô"
        />
        <InsightCard
          to="/tin-hieu#nhat-ky"
          label="Tín hiệu xu hướng & nhật ký lệnh"
          value={t.length ? `${num((wins / t.length) * 100)}% lệnh thắng` : "—"}
          sub={t.length ? `${wins}/${t.length} lệnh đã đóng · ${scan ? `${scan.items.length} mã đang giữ` : ""}` : "Đang tải…"}
          foot={journal ? `Công khai lãi lỗ từ ${dmy(journal.startDate)}` : ""}
        />
      </div>
      <p className="mt-3 text-[0.78rem] text-[var(--sm-mut)]">Số liệu mô tả trạng thái hiện tại, không phải dự báo hay khuyến nghị mua bán.</p>
    </section>
  );
}
