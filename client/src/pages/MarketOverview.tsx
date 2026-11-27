import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMaScan, fetchMarketOverview, fetchQuote, fetchSessionStats, type SessionStats } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useLivePoll } from "../hooks/useMarketClock";
import KLinePanel from "../components/KLinePanel";
import type { Quote } from "../types";

// Toàn cảnh thị trường: chỉ số, độ rộng và thanh khoản từng sàn, ngành hôm nay,
// cổ phiếu nổi bật và khối ngoại. Chỉ là số liệu phiên, không kèm nhận định mua bán.

const CARD = "rounded-[18px] border border-[var(--sm-line)] bg-[var(--sm-chart)] shadow-[0_1px_2px_rgba(31,43,29,0.04),0_8px_24px_-12px_rgba(31,43,29,0.12)]";
const vn = (n: number, d = 2) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const tone = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "text-[var(--sm-mut)]");
const ty = (vnd: number) => `${vn(Math.abs(vnd) / 1e9, 0)} tỷ`;

const EXCHANGES = [
  { symbol: "VNINDEX", label: "HOSE" },
  { symbol: "HNXINDEX", label: "HNX" },
  { symbol: "UPCOMINDEX", label: "UPCOM" },
];

// Tác động lên VN-Index: 10 mã kéo giảm mạnh nhất bên trái, 10 mã đỡ chỉ số nhiều nhất bên phải.
function ImpactChart({ st }: { st: SessionStats | null }) {
  const neg = (st?.impact ?? []).filter((x) => x.points < 0).slice(0, 10);
  const pos = (st?.impact ?? []).filter((x) => x.points > 0).slice(-10);
  const bars = [...neg, ...pos];
  const max = Math.max(0.01, ...bars.map((b) => Math.abs(b.points)));
  const H = 92; // nửa chiều cao vùng cột (px)
  return (
    <section className={`${CARD} p-5`} aria-label="Tác động lên VN-Index">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.2rem] text-[var(--sm-egg)]">
          Tác động <span className="text-[0.9rem] font-normal text-[var(--sm-mut)]">lên VN-Index</span>
        </h2>
        {st?.impactSum != null && (
          <p className="text-[0.9rem] tabular-nums text-[var(--sm-egg2)]">
            Ròng{" "}
            <b className={tone(st.impactSum)}>
              {sign(st.impactSum)}
              {vn(Math.abs(st.impactSum))} điểm
            </b>
          </p>
        )}
      </div>
      {bars.length === 0 ? (
        <p className="py-12 text-center text-[0.9rem] text-[var(--sm-mut)]">{st ? "Chưa có biến động trong phiên." : "Đang tính…"}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <div className="flex min-w-[720px] items-stretch gap-1.5">
            {bars.map((b, i) => {
              const h = Math.max(3, (Math.abs(b.points) / max) * H);
              const up = b.points > 0;
              return (
                <Link
                  key={b.symbol}
                  to={`/stock/${b.symbol}`}
                  className={`group flex min-w-0 flex-1 flex-col items-center ${i === neg.length && neg.length ? "ml-4" : ""}`}
                  title={`${b.symbol}: ${sign(b.points)}${vn(Math.abs(b.points))} điểm, giá ${sign(b.changePercent)}${vn(Math.abs(b.changePercent))}%`}
                >
                  <div className="relative w-full" style={{ height: H * 2 }}>
                    <i className="absolute inset-x-0 top-1/2 h-px bg-[var(--sm-line)]" />
                    <i
                      className="absolute inset-x-[14%] rounded-[3px] transition-opacity group-hover:opacity-80"
                      style={{ background: up ? "var(--sm-up)" : "var(--sm-dn)", height: h, ...(up ? { bottom: H } : { top: H }) }}
                    />
                    <span
                      className={`absolute inset-x-0 text-center text-[0.72rem] font-semibold tabular-nums ${up ? "up" : "down"}`}
                      style={up ? { bottom: H + h + 2 } : { top: H + h + 2 }}
                    >
                      {sign(b.points)}
                      {vn(Math.abs(b.points))}
                    </span>
                  </div>
                  <b className="mt-1 text-[0.8rem] text-[var(--sm-egg)]">{b.symbol}</b>
                  <span className={`text-[0.72rem] tabular-nums ${tone(b.changePercent)}`}>
                    {sign(b.changePercent)}
                    {vn(Math.abs(b.changePercent))}%
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-3 border-t border-[var(--sm-line2)] pt-2 text-[0.75rem] text-[var(--sm-mut)]">
        Ước tính theo vốn hóa niêm yết của {st?.coverage.used ?? "—"} mã trên HOSE (điểm = thay đổi vốn hóa ÷ hệ số chia của chỉ số), không gồm mã thiếu số liệu.
      </p>
    </section>
  );
}

function Row({ title, sub, right, children }: { title: string; sub?: string; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--sm-line2)] py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.92rem] text-[var(--sm-egg)]">{title}</p>
          {sub && <p className="text-[0.75rem] text-[var(--sm-mut)]">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// Thống kê phiên HOSE: độ rộng (trần/sàn), thanh khoản khớp lệnh/thỏa thuận, khối ngoại, mã trên MA.
function SessionPanel({ st }: { st: SessionStats | null }) {
  const ma = usePolling(fetchMaScan, [], 0);
  const b = st?.breadth;
  const t = b ? b.up + b.down + b.flat : 0;
  const deal = st?.value != null && st.matched != null ? Math.max(0, st.value - st.matched) : null;
  const maPct = (p: 20 | 50 | 200) => {
    const xs = (ma.data ?? []).filter((h) => h.ma[p] != null && h.price > 0);
    return xs.length ? Math.round((xs.filter((h) => h.price > (h.ma[p] as number)).length / xs.length) * 100) : null;
  };
  return (
    <section className={`${CARD} flex h-full flex-col p-5`} aria-label="Thống kê phiên HOSE">
      <h2 className="text-[1.2rem] text-[var(--sm-egg)]">
        Thống kê phiên <span className="text-[0.9rem] font-normal text-[var(--sm-mut)]">HOSE</span>
      </h2>
      <div className="mt-3 flex flex-1 flex-col justify-between">
        <Row
          title="Độ rộng"
          right={
            b && (
              <span className="text-[0.78rem] tabular-nums">
                <b className="text-[#a03cc9]">{b.ceiling} trần</b> · <b className="text-[#1e8fb8]">{b.floor} sàn</b>
              </span>
            )
          }
        >
          <div className="mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-[rgba(127,120,90,0.15)]">
            {t > 0 && b && (
              <>
                <i className="block h-full bg-[var(--sm-up)]" style={{ width: `${(b.up / t) * 100}%` }} />
                <i className="block h-full bg-[#e0b24a]" style={{ width: `${(b.flat / t) * 100}%` }} />
                <i className="block h-full bg-[var(--sm-dn)]" style={{ width: `${(b.down / t) * 100}%` }} />
              </>
            )}
          </div>
          <p className="mt-1.5 text-[0.8rem] tabular-nums">
            <b className="up">{b?.up ?? "—"}</b> <span className="text-[var(--sm-mut)]">tăng</span> · <b className="text-[#b8862a]">{b?.flat ?? "—"}</b>{" "}
            <span className="text-[var(--sm-mut)]">đứng giá</span> · <b className="down">{b?.down ?? "—"}</b> <span className="text-[var(--sm-mut)]">giảm</span>
          </p>
        </Row>

        <Row
          title="Thanh khoản khớp lệnh"
          sub={st?.vsAvg20 ? `Khối lượng cả phiên ${sign(st.vsAvg20.pct)}${vn(Math.abs(st.vsAvg20.pct), 1)}% so với TB 20 phiên` : undefined}
          right={
            <span className="text-right tabular-nums">
              <b className="block text-[1.05rem] text-[var(--sm-egg)]">{st?.matched != null ? ty(st.matched) : "—"}</b>
              {deal != null && <span className="text-[0.75rem] text-[var(--sm-mut)]">thỏa thuận {ty(deal)}</span>}
            </span>
          }
        >
          {st?.vsAvg20 && (
            <div className="relative mt-2 h-2 rounded-full bg-[rgba(127,120,90,0.15)]">
              <i
                className="absolute inset-y-0 left-0 rounded-full bg-[#1f3a5f]"
                style={{ width: `${Math.min(100, (st.vsAvg20.today / (st.vsAvg20.avg20 * 1.5)) * 100)}%` }}
              />
              <i className="absolute -top-1 h-4 w-[2px] bg-[var(--sm-egg)]" style={{ left: `${100 / 1.5}%` }} title="Trung bình 20 phiên" />
            </div>
          )}
        </Row>

        <Row
          title="Khối ngoại ròng"
          sub={st ? `Mua ${ty(st.foreign.buy)} · bán ${ty(st.foreign.sell)} (khớp lệnh)` : undefined}
          right={
            <b className={`text-[1.05rem] tabular-nums ${tone(st?.foreign.net ?? 0)}`}>
              {st ? `${sign(st.foreign.net)}${ty(st.foreign.net)}` : "—"}
            </b>
          }
        />

        <Row title="Mã trên đường trung bình" sub={ma.data ? `Trong ${ma.data.length} mã theo dõi, giá đóng cửa phiên gần nhất` : ma.loading ? "Đang tính…" : "Chưa có số liệu"}>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {([20, 50, 200] as const).map((p) => {
              const v = maPct(p);
              return (
                <div key={p}>
                  <p className="text-[0.75rem] text-[var(--sm-mut)]">
                    MA{p} <b className={v == null ? "" : v >= 50 ? "up" : "down"}>{v == null ? "—" : `${v}%`}</b>
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgba(127,120,90,0.15)]">
                    <i className="block h-full rounded-full" style={{ width: `${v ?? 0}%`, background: v != null && v >= 50 ? "var(--sm-up)" : "var(--sm-dn)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Row>
      </div>
    </section>
  );
}

function Breadth() {
  const poll = useLivePoll(5_000);
  const qs = usePolling(() => Promise.all(EXCHANGES.map((e) => fetchQuote(e.symbol).catch(() => null))), [], poll);
  return (
    <section className={`${CARD} flex h-full flex-col p-5`} aria-label="Độ rộng thị trường">
      <h2 className="text-[1.2rem] text-[var(--sm-egg)]">Ba sàn trong phiên</h2>
      <p className="mt-0.5 text-[0.8rem] text-[var(--sm-mut)]">Số mã tăng, đứng giá, giảm và giá trị khớp lệnh từng sàn trong phiên.</p>
      <ul className="mt-4 grid gap-x-10 gap-y-5 md:grid-cols-3">
        {EXCHANGES.map((e, i) => {
          const q = qs.data?.[i];
          const up = q?.advances ?? 0, dn = q?.declines ?? 0, fl = q?.noChanges ?? 0;
          const t = up + dn + fl;
          return (
            <li key={e.symbol}>
              <div className="flex items-baseline justify-between gap-2 text-[0.9rem]">
                <b className="text-[var(--sm-egg)]">{e.label}</b>
                {q ? (
                  <span className="tabular-nums">
                    <b className="text-[var(--sm-egg)]">{vn(q.price)}</b>{" "}
                    <span className={tone(q.change)}>
                      {sign(q.change)}
                      {vn(Math.abs(q.changePercent))}%
                    </span>
                  </span>
                ) : (
                  <span className="text-[var(--sm-mut)]">—</span>
                )}
              </div>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[rgba(127,120,90,0.15)]" role="img" aria-label={`${up} tăng, ${fl} đứng giá, ${dn} giảm`}>
                {t > 0 && (
                  <>
                    <i className="block h-full bg-[var(--sm-up)]" style={{ width: `${(up / t) * 100}%` }} />
                    <i className="block h-full bg-[#e0b24a]" style={{ width: `${(fl / t) * 100}%` }} />
                    <i className="block h-full bg-[var(--sm-dn)]" style={{ width: `${(dn / t) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="mt-1.5 flex justify-between text-[0.78rem] tabular-nums">
                <span>
                  <b className="up">{t ? up : "—"}</b> <span className="text-[var(--sm-mut)]">tăng</span> · <b className="text-[#b8862a]">{t ? fl : "—"}</b>{" "}
                  <span className="text-[var(--sm-mut)]">đứng</span> · <b className="down">{t ? dn : "—"}</b> <span className="text-[var(--sm-mut)]">giảm</span>
                </span>
                <span className="text-[var(--sm-egg2)]">{q?.value ? ty(q.value) : "—"}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SectorsToday({ quotes, loading }: { quotes: Quote[]; loading: boolean }) {
  // bình quân % thay đổi các mã trong ngành; mã dẫn dắt = 3 mã giá trị giao dịch lớn nhất
  const rows = useMemo(() => {
    const g = new Map<string, Quote[]>();
    for (const q of quotes) if (q.sector) g.set(q.sector, [...(g.get(q.sector) ?? []), q]);
    return [...g.entries()]
      .filter(([, xs]) => xs.length >= 2)
      .map(([sector, xs]) => ({
        sector,
        n: xs.length,
        pct: xs.reduce((a, q) => a + q.changePercent, 0) / xs.length,
        leaders: [...xs].sort((a, b) => b.price * b.volume - a.price * a.volume).slice(0, 3).map((q) => q.symbol),
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [quotes]);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pct ?? 0)));
  return (
    <section className={`${CARD} p-5`} aria-label="Ngành hôm nay">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.2rem] text-[var(--sm-egg)]">Ngành hôm nay</h2>
        <Link to="/song-nganh" className="text-[0.88rem] font-semibold text-[var(--sm-gold2)] hover:underline">
          Xem sóng ngành
        </Link>
      </div>
      <p className="mt-0.5 text-[0.8rem] text-[var(--sm-mut)]">Thay đổi giá bình quân các mã trong ngành so với phiên trước. Chữ nhỏ là 3 mã có giá trị giao dịch lớn nhất ngành.</p>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[0.9rem] text-[var(--sm-mut)]">{loading ? "Đang tải…" : "Chưa có số liệu ngành."}</p>
      ) : (
        <ul className="mt-4 grid gap-x-8 gap-y-2.5 md:grid-cols-2">
          {rows.map((s) => {
            const p = s.pct ?? 0;
            return (
              <li key={s.sector} className="grid grid-cols-[9.5rem_1fr_4rem] items-center gap-3 text-[0.88rem]">
                <span className="truncate text-[var(--sm-egg)]" title={`${s.sector} · ${s.n} mã`}>
                  {s.sector}
                </span>
                <span className="relative h-5">
                  <i
                    className="absolute top-0 h-full rounded-[4px]"
                    style={{ left: p >= 0 ? "50%" : `${50 - (Math.abs(p) / max) * 50}%`, width: `${(Math.abs(p) / max) * 50}%`, background: p >= 0 ? "var(--sm-up)" : "var(--sm-dn, #c0392b)", opacity: 0.75 }}
                  />
                  <i className="absolute top-0 left-1/2 h-full w-px bg-[var(--sm-line)]" />
                  {s.leaders.length > 0 && (
                    <span className={`absolute top-1/2 -translate-y-1/2 text-[0.7rem] text-[var(--sm-mut)] ${p >= 0 ? "right-[52%]" : "left-[52%]"}`}>{s.leaders.slice(0, 3).join(" ")}</span>
                  )}
                </span>
                <b className={`text-right tabular-nums ${tone(p)}`}>
                  {sign(p)}
                  {vn(Math.abs(p))}%
                </b>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type TopTab = "up" | "down" | "value" | "fbuy" | "fsell";
const TABS: { v: TopTab; t: string }[] = [
  { v: "up", t: "Tăng mạnh" },
  { v: "down", t: "Giảm mạnh" },
  { v: "value", t: "Giá trị giao dịch" },
  { v: "fbuy", t: "Khối ngoại mua ròng" },
  { v: "fsell", t: "Khối ngoại bán ròng" },
];

const fnet = (q: Quote) => ((q.foreignBuyVolume ?? 0) - (q.foreignSellVolume ?? 0)) * q.price;

function TopStocks({ quotes, loading }: { quotes: Quote[]; loading: boolean }) {
  const [tab, setTab] = useState<TopTab>("up");
  const totals = useMemo(() => {
    let fb = 0, fs = 0;
    for (const q of quotes) {
      fb += (q.foreignBuyVolume ?? 0) * q.price;
      fs += (q.foreignSellVolume ?? 0) * q.price;
    }
    return { fb, fs, net: fb - fs };
  }, [quotes]);
  const list = useMemo(() => {
    const xs = [...quotes];
    if (tab === "up") xs.sort((a, b) => b.changePercent - a.changePercent);
    if (tab === "down") xs.sort((a, b) => a.changePercent - b.changePercent);
    if (tab === "value") xs.sort((a, b) => b.price * b.volume - a.price * a.volume);
    if (tab === "fbuy") return xs.filter((q) => fnet(q) > 0).sort((a, b) => fnet(b) - fnet(a)).slice(0, 12);
    if (tab === "fsell") return xs.filter((q) => fnet(q) < 0).sort((a, b) => fnet(a) - fnet(b)).slice(0, 12);
    return xs.slice(0, 12);
  }, [quotes, tab]);
  const foreign = tab === "fbuy" || tab === "fsell";

  return (
    <section className={`${CARD} p-5`} aria-label="Cổ phiếu nổi bật">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[1.2rem] text-[var(--sm-egg)]">Cổ phiếu nổi bật</h2>
        {quotes.length > 0 && (
          <p className="text-[0.85rem] tabular-nums text-[var(--sm-egg2)]">
            Khối ngoại: mua {ty(totals.fb)} · bán {ty(totals.fs)} ·{" "}
            <b className={tone(totals.net)}>
              ròng {sign(totals.net)}
              {ty(totals.net)}
            </b>
          </p>
        )}
      </div>
      <div role="tablist" aria-label="Xếp hạng" className="mt-3 flex flex-wrap gap-1.5">
        {TABS.map((x) => (
          <button
            key={x.v}
            type="button"
            role="tab"
            aria-selected={tab === x.v}
            onClick={() => setTab(x.v)}
            className={`rounded-full border px-3 py-1 text-[0.84rem] font-semibold transition-colors ${
              tab === x.v ? "border-[var(--sm-gold)] bg-[rgba(201,162,74,0.14)] text-[var(--sm-egg)]" : "border-[var(--sm-line)] text-[var(--sm-mut)] hover:text-[var(--sm-egg)]"
            }`}
          >
            {x.t}
          </button>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[0.9rem] tabular-nums">
          <thead>
            <tr className="text-[0.75rem] text-[var(--sm-mut)]">
              <th className="py-1.5 text-left font-normal">Mã</th>
              <th className="py-1.5 text-right font-normal">Giá</th>
              <th className="py-1.5 text-right font-normal">Thay đổi</th>
              <th className="py-1.5 text-right font-normal">Giá trị GD</th>
              <th className="py-1.5 text-right font-normal">{foreign ? "Khối ngoại ròng" : "Khối lượng"}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--sm-mut)]">
                  {loading ? "Đang tải bảng giá…" : "Không có mã phù hợp trong phiên."}
                </td>
              </tr>
            ) : (
              list.map((q) => (
                <tr key={q.symbol} className="border-t border-[var(--sm-line2)]">
                  <td className="py-1.5">
                    <Link to={`/stock/${q.symbol}`} className="font-semibold text-[var(--sm-egg)] hover:underline">
                      {q.symbol}
                    </Link>
                    <span className="ml-2 text-[0.72rem] text-[var(--sm-mut)]">{q.exchange}</span>
                  </td>
                  <td className={`py-1.5 text-right font-semibold ${tone(q.change)}`}>{vn(q.price / 1000)}</td>
                  <td className={`py-1.5 text-right ${tone(q.change)}`}>
                    {sign(q.changePercent)}
                    {vn(Math.abs(q.changePercent))}%
                  </td>
                  <td className="py-1.5 text-right text-[var(--sm-egg2)]">{ty(q.price * q.volume)}</td>
                  <td className={`py-1.5 text-right ${foreign ? tone(fnet(q)) : "text-[var(--sm-egg2)]"}`}>
                    {foreign ? `${sign(fnet(q))}${ty(fnet(q))}` : vn(q.volume, 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.75rem] text-[var(--sm-mut)]">Trong {quotes.length || "—"} mã theo dõi trên Bull Stock. Giá nghìn đồng, cập nhật trong phiên.</p>
    </section>
  );
}

export default function MarketOverview() {
  const board = usePolling(fetchMarketOverview, [], useLivePoll(5_000));
  const quotes = useMemo(() => (board.data?.quotes ?? []).filter((q) => q.price > 0 && q.volume > 0), [board.data]);
  const loading = board.loading && !board.data;
  const stats = usePolling(fetchSessionStats, [], useLivePoll(20_000));
  return (
    <div className="text-[var(--sm-egg)]">
      <header className="border-b border-[var(--sm-line)] bg-[var(--sm-panel)]">
        <div className="gutter-x mx-auto max-w-[1920px] py-8">
          <h1 className="text-[clamp(2rem,3.6vw,2.8rem)] leading-tight text-[var(--sm-egg)]">Toàn cảnh thị trường</h1>
          <p className="mt-2 max-w-[44rem] text-[1.05rem] leading-relaxed text-[var(--sm-egg2)]">
            Chỉ số, độ rộng, ngành và dòng tiền khối ngoại trong phiên, gom vào một trang.
          </p>
        </div>
      </header>

      <div className="gutter-x mx-auto flex max-w-[1920px] flex-col gap-6 pt-8 pb-20">
        <div className="grid items-stretch gap-6 lg:h-[640px] lg:grid-cols-12">
          <div className="min-h-[460px] min-w-0 lg:col-span-8 lg:min-h-0">
            <KLinePanel symbol="VNINDEX" height={460} fill soft />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <SessionPanel st={stats.data} />
          </div>
        </div>

        <ImpactChart st={stats.data} />
        <Breadth />
        <SectorsToday quotes={quotes} loading={loading} />
        <TopStocks quotes={quotes} loading={loading} />

        <p className="text-[0.78rem] text-[var(--sm-mut)]">Nguồn: bảng giá VPS, tổng hợp của Bull Stock. Số liệu chỉ để tham khảo, không phải khuyến nghị mua bán.</p>
      </div>
    </div>
  );
}
