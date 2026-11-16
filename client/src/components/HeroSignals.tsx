import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchHistory, fetchTrendBuyResult, fetchTradeJournal } from "../api/client";
import { formatPrice } from "../utils/format";
import MarketIndexCards from "./MarketIndexCards";

// Opening block of the Giới thiệu page: today's index cards, then one card
// with what the last closed session changed in the signal list — new buys,
// exits, how many are held — the whole portfolio's result (held positions at
// the last close plus closed trades) and the system's real track record. Data: the
// same scan and forward-only trade journal as the signal list on the home page.

const POLL_MS = 5 * 60 * 1000;
const LINE = "border-[rgba(213,223,204,0.14)]";
const WEEKDAY = ["Chủ nhật", "thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy"];
const UP = "#3fd07a";
const DOWN = "#ff5c5c";

const day = (iso: string) => iso.slice(0, 10);
function dmy(iso: string): string {
  const [y, m, d] = day(iso).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}
function dm(iso: string): string {
  const [, m, d] = day(iso).split("-");
  return d && m ? `${d}/${m}` : iso;
}
function weekday(iso: string): string {
  const [y, m, d] = day(iso).split("-").map(Number);
  if (!y || !m || !d) return "";
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
function pct(n: number, digits = 1, sign = true): string {
  const s = Math.abs(n).toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n < 0 ? "−" : sign && n > 0 ? "+" : ""}${s}%`;
}
const toneHex = (n: number) => (n > 0 ? UP : n < 0 ? DOWN : "#d5dfcc");

// Small closing-price line for the last month; nothing is drawn until it loads.
function Spark({ symbol, color }: { symbol: string; color: string }) {
  const { data } = usePolling(() => fetchHistory(symbol, "1M"), [symbol]);
  const pts = (data?.points ?? []).map((p) => p.close).filter((v) => Number.isFinite(v));
  if (pts.length < 2) return <span className="block h-6 w-20" aria-hidden="true" />;
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const xy = pts
    .map((v, i) => `${((i / (pts.length - 1)) * 80).toFixed(1)},${(23 - ((v - mn) / (mx - mn || 1)) * 22).toFixed(1)}`)
    .join(" ");
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" aria-hidden="true" className="block">
      <polyline points={xy} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

type Row = {
  key: string;
  kind: "MUA" | "BÁN" | "GIỮ";
  symbol: string;
  note: string;
  value: string;
  color: string;
};

function SignalRow({ r }: { r: Row }) {
  const badge =
    r.kind === "MUA"
      ? "bg-[rgba(63,208,122,0.14)] text-[#3fd07a]"
      : r.kind === "BÁN"
        ? "bg-[rgba(255,92,92,0.13)] text-[#ff5c5c]"
        : "bg-[rgba(185,203,169,0.12)] text-[#b9cba9]";
  return (
    <li className={`border-t ${LINE}`}>
      <Link
        to={`/stock/${r.symbol}`}
        className="fx-row grid min-h-14 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-2.5 transition-colors duration-200 hover:bg-[rgba(127,214,168,0.06)] sm:grid-cols-[3rem_minmax(0,1fr)_5rem_5rem] sm:px-[18px]"
      >
        <span className={`inline-flex h-6 items-center justify-center rounded text-[11px] font-bold tracking-[0.04em] ${badge}`}>
          {r.kind}
        </span>
        <span className="min-w-0">
          <b className="block text-lg leading-tight text-[#fff]">{r.symbol}</b>
          <span className="block truncate text-[0.8rem] text-[#8fa882]">{r.note}</span>
        </span>
        <span className="hidden sm:block">
          <Spark symbol={r.symbol} color={r.color} />
        </span>
        <b className="text-right text-lg tabular-nums" style={{ color: r.color }}>
          {r.value}
        </b>
      </Link>
    </li>
  );
}

function Stat({ n, label, color = "#fff" }: { n: number; label: string; color?: string }) {
  return (
    <div className={`flex-1 border-l px-4 py-3.5 first:border-l-0 sm:px-[18px] ${LINE}`}>
      <b className="block text-[1.9rem] leading-none tabular-nums" style={{ color }}>
        {n}
      </b>
      <span className="mt-1.5 block text-[0.8rem] text-[#8fa882]">{label}</span>
    </div>
  );
}

function Perf({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[rgb(17,25,18)] px-4 py-3 sm:px-[18px]">
      <span className="block text-xs text-[#8fa882]">{label}</span>
      <b className="mt-0.5 block text-[1.05rem] tabular-nums" style={{ color }}>
        {value}
      </b>
    </div>
  );
}

export default function HeroSignals() {
  const { data: scan } = usePolling(() => fetchTrendBuyResult(), [], POLL_MS);
  const { data: journal } = usePolling(() => fetchTradeJournal(), [], POLL_MS);

  const session = scan?.sessionDate ?? "";
  const holding = Array.isArray(scan?.items) ? scan.items : [];
  const closedAll = Array.isArray(journal?.closed) ? journal.closed : [];
  const buys = session ? holding.filter((h) => day(h.buyDate) === session) : [];
  const exits = session ? closedAll.filter((t) => day(t.sellDate) === session) : [];

  let rows: Row[] = [
    ...buys.map((h) => ({
      key: "b" + h.symbol,
      kind: "MUA" as const,
      symbol: h.symbol,
      note: `Vào lệnh ${dm(h.buyDate)} · giá đóng cửa`,
      value: formatPrice(h.buyPrice, h.currency),
      color: UP,
    })),
    ...exits.map((t) => ({
      key: "s" + t.symbol + t.sellDate,
      kind: "BÁN" as const,
      symbol: t.symbol,
      note: `Giữ ${t.holdingDays} ngày · thoát ${dm(t.sellDate)}`,
      value: pct(t.returnPercent),
      color: toneHex(t.returnPercent),
    })),
  ];
  // Quiet session: show what the system is holding instead of an empty list.
  if (rows.length === 0) {
    rows = [...holding]
      .sort((a, b) => b.signalReturnPercent - a.signalReturnPercent)
      .slice(0, 4)
      .map((h) => ({
        key: "h" + h.symbol,
        kind: "GIỮ" as const,
        symbol: h.symbol,
        note: `Giữ từ ${dm(h.buyDate)}`,
        value: pct(h.signalReturnPercent),
        color: toneHex(h.signalReturnPercent),
      }));
  }

  const n = closedAll.length;
  const wins = closedAll.filter((t) => t.returnPercent > 0);
  const losses = closedAll.filter((t) => t.returnPercent < 0);
  const avg = (xs: typeof closedAll) => (xs.length ? xs.reduce((a, t) => a + t.returnPercent, 0) / xs.length : 0);
  const avgHold = n ? closedAll.reduce((a, t) => a + t.holdingDays, 0) / n : 0;
  const best = n ? closedAll.reduce((a, t) => (t.returnPercent > a.returnPercent ? t : a)) : null;
  const worst = n ? closedAll.reduce((a, t) => (t.returnPercent < a.returnPercent ? t : a)) : null;

  // Whole portfolio, every trade sized the same: positions still held are
  // marked to the last close, closed ones count at their final result.
  const openRets = holding.map((h) => h.signalReturnPercent).filter((v) => Number.isFinite(v));
  const openAvg = openRets.length ? openRets.reduce((a, v) => a + v, 0) / openRets.length : 0;
  const openUp = openRets.filter((v) => v > 0).length;
  const openDown = openRets.filter((v) => v < 0).length;
  const allRets = [...openRets, ...closedAll.map((t) => t.returnPercent)];
  const allAvg = allRets.length ? allRets.reduce((a, v) => a + v, 0) / allRets.length : 0;

  return (
    <div>
      <p className="mb-3 text-[0.95rem] font-bold uppercase tracking-[0.06em] text-[#b9cba9]">Thị trường hôm nay</p>
      <MarketIndexCards />

      <section
        aria-label="Tín hiệu phiên gần nhất"
        className="mt-4 max-w-[600px] overflow-hidden rounded-xl border border-[rgba(213,223,204,0.18)] bg-[rgba(14,21,15,0.9)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]"
      >
        {!scan || !session ? (
          <div aria-busy="true" className="space-y-3 p-5">
            <div className="h-4 w-48 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-10 w-full animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-10 w-full animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
          </div>
        ) : (
          <>
            <header className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-4 py-3 sm:px-[18px] ${LINE}`}>
              <span className="flex items-center gap-2 text-sm font-bold text-[#fff]">
                <span aria-hidden="true" className="hero-pulse inline-block h-2 w-2 rounded-full bg-[#3fd07a]" />
                Chốt phiên {weekday(session)} {dmy(session)}
              </span>
              <span className="text-[0.8rem] text-[#8fa882]">Phiên tới: cập nhật sau 15:00</span>
            </header>
            <div className="flex">
              <Stat n={buys.length} label="Mã mua mới" color={buys.length ? UP : "#fff"} />
              <Stat n={exits.length} label="Mã thoát lệnh" />
              <Stat n={holding.length} label="Đang giữ" />
            </div>
            {rows.length > 0 && (
              <ul>
                {rows.map((r) => (
                  <SignalRow key={r.key} r={r} />
                ))}
              </ul>
            )}
            {allRets.length > 0 && (
              <div className={`border-t ${LINE}`}>
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-4 pt-3 pb-2.5 sm:px-[18px]">
                  <div>
                    <b className="block text-sm text-[#fff]">Hiệu suất tổng danh mục</b>
                    <span className="text-xs text-[#8fa882]">
                      {allRets.length} lệnh ({openRets.length} đang giữ + {n} đã đóng), mỗi lệnh vốn như nhau
                    </span>
                  </div>
                  <b className="text-[1.9rem] leading-none tabular-nums" style={{ color: toneHex(allAvg) }}>
                    {pct(allAvg, 2)}
                  </b>
                </div>
                <div className="grid grid-cols-2 gap-px bg-[rgba(213,223,204,0.12)] sm:grid-cols-4">
                  <Perf label="Đang giữ" value={`${openRets.length} mã`} />
                  <Perf label="Lãi/lỗ tạm tính TB" value={openRets.length ? pct(openAvg, 2) : "—"} color={toneHex(openAvg)} />
                  <Perf label="Mã đang lãi" value={`${openUp} mã`} color={openUp ? UP : "#fff"} />
                  <Perf label="Mã đang lỗ" value={`${openDown} mã`} color={openDown ? DOWN : "#fff"} />
                </div>
              </div>
            )}
            {journal?.startDate && (
              <div className={`border-t ${LINE}`}>
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pt-3 pb-2 sm:px-[18px]">
                  <b className="text-sm text-[#fff]">Hiệu suất hệ thống</b>
                  <span className="text-xs text-[#8fa882]">
                    tất cả lệnh đã đóng, ghi thật từ {dmy(journal.startDate)}
                  </span>
                </p>
                {n === 0 ? (
                  <p className="px-4 pb-3 text-sm text-[#a9b8a0] sm:px-[18px]">Chưa có lệnh nào đóng.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-px bg-[rgba(213,223,204,0.12)] sm:grid-cols-4">
                    <Perf label="Lệnh đã đóng" value={`${n} lệnh`} />
                    <Perf label="Tỷ lệ thắng" value={`${pct((wins.length / n) * 100, 0, false)} (${wins.length}/${n})`} />
                    <Perf label="Lãi/lỗ TB mỗi lệnh" value={pct(avg(closedAll), 2)} color={toneHex(avg(closedAll))} />
                    <Perf label="Giữ trung bình" value={`${Math.round(avgHold)} ngày`} />
                    <Perf label="Thắng trung bình" value={wins.length ? pct(avg(wins)) : "—"} color={UP} />
                    <Perf label="Thua trung bình" value={losses.length ? pct(avg(losses)) : "—"} color={DOWN} />
                    <Perf
                      label="Lãi nhất"
                      value={best && best.returnPercent > 0 ? `${best.symbol} ${pct(best.returnPercent)}` : "—"}
                      color={UP}
                    />
                    <Perf
                      label="Lỗ nhất"
                      value={worst && worst.returnPercent < 0 ? `${worst.symbol} ${pct(worst.returnPercent)}` : "—"}
                      color={DOWN}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
