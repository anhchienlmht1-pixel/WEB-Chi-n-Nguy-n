import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchSectorWaves, fetchSectorWavesLive, type SectorWaves, type SectorWavesLive } from "../api/client";

// Sóng ngành theo cách nhìn của Mark Minervini:
//  - VN-Index và 4 giai đoạn (1 tích lũy · 2 tăng · 3 phân phối · 4 giảm)
//  - Mỗi tuần, mỗi ngành: % số mã đạt Trend Template. Ngành có từ 50% trở lên
//    là "đang có sóng". Bản đồ nhiệt cho thấy sóng xuất hiện, lan và tắt ra sao.

const STAGE: Record<1 | 2 | 3 | 4, { label: string; short: string; fill: string; text: string }> = {
  1: { label: "Giai đoạn 1 · Tích lũy", short: "Tích lũy", fill: "rgba(160,160,140,0.10)", text: "var(--sm-mut)" },
  2: { label: "Giai đoạn 2 · Xu hướng tăng", short: "Tăng", fill: "rgba(79,209,139,0.12)", text: "var(--sm-up)" },
  3: { label: "Giai đoạn 3 · Phân phối", short: "Phân phối", fill: "rgba(230,190,90,0.14)", text: "#c58a1c" },
  4: { label: "Giai đoạn 4 · Xu hướng giảm", short: "Giảm", fill: "rgba(255,107,94,0.10)", text: "var(--sm-dn)" },
};

const vn = (n: number, d = 0) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const my = (d: string) => `${d.slice(5, 7)}/${d.slice(2, 4)}`;

type Range = "all" | "5y" | "2y";
const RANGES: { v: Range; t: string }[] = [
  { v: "all", t: "Từ 2000" },
  { v: "5y", t: "5 năm" },
  { v: "2y", t: "2 năm" },
];

// màu ô bản đồ nhiệt: 0% nhạt → 100% xanh đậm; từ ngưỡng sóng trở lên có viền vàng
function cellColor(p: number | null): string {
  if (p == null) return "transparent";
  const a = Math.min(1, p / 100);
  return `color-mix(in srgb, #1f9d63 ${Math.round(8 + a * 82)}%, transparent)`;
}

export default function SectorWavesPage() {
  const [raw, setRaw] = useState<SectorWaves | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [range, setRange] = useState<Range>("all");

  // Lịch sử từ năm 2000 được server dựng dần: gọi lại cho tới khi đủ mã.
  useEffect(() => {
    let off = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () =>
      fetchSectorWaves()
        .then((x) => {
          if (off) return;
          setRaw(x);
          setErr(null);
          if (x.progress && x.progress.done < x.progress.total) timer = setTimeout(load, 1500);
        })
        .catch((e) => {
          if (off) return;
          setErr(e instanceof Error ? e.message : String(e));
          timer = setTimeout(load, 8000);
        });
    load();
    return () => {
      off = true;
      clearTimeout(timer);
    };
  }, []);

  // Khung xem: từ 2000 (mỗi tháng một điểm), 5 năm hoặc 2 năm (mỗi tuần một điểm).
  const d = useMemo<SectorWaves | null>(() => {
    if (!raw) return null;
    const W = raw.weeks.length;
    let pick: number[];
    if (range === "all") {
      pick = raw.weeks.map((_, i) => i).filter((i) => i === W - 1 || raw.weeks[i + 1].slice(0, 7) !== raw.weeks[i].slice(0, 7));
    } else {
      const k = range === "5y" ? 261 : 104;
      pick = raw.weeks.map((_, i) => i).slice(-k);
    }
    const sel = <T,>(a: T[]) => pick.map((i) => a[i]);
    return {
      ...raw,
      weeks: sel(raw.weeks),
      vnindex: {
        close: sel(raw.vnindex.close),
        ma50: sel(raw.vnindex.ma50),
        ma150: sel(raw.vnindex.ma150),
        ma200: sel(raw.vnindex.ma200),
        stage: sel(raw.vnindex.stage),
      },
      breadth: sel(raw.breadth),
      sectors: raw.sectors.map((s) => ({ ...s, pct: sel(s.pct), highs: sel(s.highs) })),
    };
  }, [raw, range]);

  // Trạng thái trong phiên (giá khớp hiện tại), làm mới mỗi 30 giây.
  const [live, setLive] = useState<SectorWavesLive | null>(null);
  useEffect(() => {
    let off = false;
    const tick = () =>
      fetchSectorWavesLive()
        .then((x) => !off && setLive(x))
        .catch(() => {});
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      off = true;
      clearInterval(id);
    };
  }, []);
  const liveOf = useMemo(() => new Map((live?.sectors ?? []).map((x) => [x.sector, x])), [live]);
  const liveTime = live ? new Date(live.asOf).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : null;

  // Thay đổi 4 tuần (luôn tính trên dữ liệu tuần, không phụ thuộc khung xem)
  const ch4 = useMemo(() => {
    const m: Record<string, number | null> = {};
    if (!raw) return m;
    const L = raw.weeks.length - 1;
    for (const s of raw.sectors) {
      const a = s.pct[L], b = s.pct[Math.max(0, L - 4)];
      m[s.sector] = a != null && b != null ? a - b : null;
    }
    return m;
  }, [raw]);

  const view = useMemo(() => {
    if (!d || !raw) return null;
    const n = d.weeks.length;
    const last = n - 1;
    const waveCount = d.weeks.map((_, w) => d.sectors.filter((s) => (s.pct[w] ?? 0) >= d.threshold).length);
    const now = (x: { sector: string; pct: (number | null)[] }) => liveOf.get(x.sector)?.pct ?? x.pct[last] ?? -1;
    const rows = [...d.sectors].sort((a, b) => now(b) - now(a));
    const chart = d.weeks.map((t, w) => ({
      t,
      close: d.vnindex.close[w],
      ma50: d.vnindex.ma50[w],
      ma150: d.vnindex.ma150[w],
      ma200: d.vnindex.ma200[w],
      stage: d.vnindex.stage[w],
      waves: waveCount[w],
      breadth: d.breadth[w],
    }));
    // các đoạn liên tiếp cùng giai đoạn → vùng nền
    const bands: { x1: string; x2: string; s: 1 | 2 | 3 | 4 }[] = [];
    for (let w = 0; w < n; w++) {
      const s = d.vnindex.stage[w];
      if (!s) continue;
      const b = bands[bands.length - 1];
      if (b && b.s === s && b.x2 === d.weeks[w - 1]) b.x2 = d.weeks[w];
      else bands.push({ x1: d.weeks[w], x2: d.weeks[w], s });
    }
    return { n, last, waveCount, rows, chart, bands };
  }, [d, raw, liveOf]);

  return (
    <div className="text-[var(--sm-egg)]">
      <header className="border-b border-[var(--sm-line)] bg-[var(--sm-panel)]">
        <div className="gutter-x mx-auto max-w-[1280px] py-8">
          <h1 className="text-[clamp(2rem,3.6vw,2.8rem)] leading-tight">Sóng ngành</h1>
          <p className="mt-2 max-w-[48rem] text-[1.05rem] leading-relaxed text-[var(--sm-egg2)]">
            Theo cách nhìn của Mark Minervini: một ngành đang có sóng khi nhiều cổ phiếu trong ngành cùng lúc vào xu hướng tăng (đạt Trend Template). Biểu đồ VN-Index cho
            biết thị trường đang ở giai đoạn nào; bản đồ nhiệt bên dưới cho biết sóng đang nằm ở ngành nào.
          </p>
        </div>
      </header>

      <div className="gutter-x mx-auto max-w-[1280px] pb-20">
        {err && (
          <p className="mt-8 rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-4 text-[var(--sm-egg2)]">
            Chưa tải được dữ liệu sóng ngành ({err}). Lần tính đầu tiên của mỗi phiên mất khoảng 20–30 giây; tải lại trang sau ít phút.
          </p>
        )}
        {!d && !err && (
          <div aria-busy="true" className="mt-8 space-y-4">
            <div className="h-24 animate-pulse rounded-md bg-[var(--ab-skel)]" />
            <div className="h-[420px] animate-pulse rounded-md bg-[var(--ab-skel)]" />
            <p className="text-[0.9rem] text-[var(--sm-mut)]">Đang tính sóng ngành cho gần 200 mã, lần đầu mỗi phiên có thể mất vài chục giây…</p>
          </div>
        )}

        {d && view && (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div role="group" aria-label="Khung thời gian" className="inline-flex rounded-md bg-[rgba(127,120,90,0.12)] p-0.5">
                {RANGES.map((r) => (
                  <button
                    key={r.v}
                    type="button"
                    aria-pressed={range === r.v}
                    onClick={() => setRange(r.v)}
                    className={`inline-flex h-8 items-center rounded-[5px] px-3.5 text-[0.88rem] font-semibold transition-colors ${
                      range === r.v ? "bg-[var(--sm-pop)] text-[var(--sm-egg)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-[var(--sm-mut)] hover:text-[var(--sm-egg)]"
                    }`}
                  >
                    {r.t}
                  </button>
                ))}
              </div>
              {raw && raw.progress && raw.progress.done < raw.progress.total && (
                <div className="flex min-w-[260px] items-center gap-3 text-[0.85rem] text-[var(--sm-egg2)]" role="status">
                  <span>
                    Đang dựng lịch sử từ năm 2000: {raw.progress.done}/{raw.progress.total} mã
                  </span>
                  <span className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--sm-line)]">
                    <i className="block h-full bg-[var(--sm-gold)]" style={{ width: `${(raw.progress.done / raw.progress.total) * 100}%` }} />
                  </span>
                </div>
              )}
            </div>

            {/* Trạng thái hiện tại */}
            <section aria-label="Trạng thái hiện tại" className="mt-4 grid gap-px overflow-hidden rounded-md border border-[var(--sm-line)] bg-[var(--sm-line)] sm:grid-cols-2 lg:grid-cols-4">
              {(() => {
                const s = d.vnindex.stage[view.last];
                const top = view.rows[0];
                const topLive = top ? liveOf.get(top.sector) : undefined;
                const wv = live ? live.sectors.filter((x) => (x.pct ?? 0) >= d.threshold).length : view.waveCount[view.last];
                const R = raw!;
                const RL = R.weeks.length - 1;
                const wv4 = R.sectors.filter((x) => (x.pct[Math.max(0, RL - 4)] ?? 0) >= R.threshold).length;
                const b = live?.breadth ?? d.breadth[view.last];
                const when = live?.intraday ? `Trong phiên, ${liveTime}` : `Phiên ${dmy(d.sessionDate)}`;
                const b4 = R.breadth[Math.max(0, RL - 4)];
                const cells = [
                  { k: "VN-Index", v: s ? STAGE[s].label : "—", cls: s ? STAGE[s].text : "", sub: `Chốt phiên ${dmy(d.sessionDate)}` },
                  {
                    k: "Ngành đang có sóng",
                    v: `${wv}/${d.sectors.length}`,
                    cls: wv > 0 ? "up" : "",
                    sub: `${when} · từ ${d.threshold}% mã đạt Trend Template · 4 tuần trước: ${wv4}`,
                  },
                  {
                    k: "Toàn thị trường đạt Trend Template",
                    v: b == null ? "—" : `${vn(b, 1)}%`,
                    cls: "",
                    sub: `${when}${b != null && b4 != null ? ` · ${b >= b4 ? "+" : ""}${vn(b - b4, 1)} điểm % so với 4 tuần trước` : ""}`,
                  },
                  {
                    k: "Ngành mạnh nhất",
                    v: top ? top.sector : "—",
                    cls: "",
                    sub: top
                      ? `${vn(topLive?.pct ?? top.pct[view.last] ?? 0, 0)}% mã đạt · ${(topLive?.leaders ?? top.leaders).slice(0, 4).join(", ")}`
                      : "",
                  },
                ];
                return cells.map((c) => (
                  <div key={c.k} className="bg-[var(--sm-panel)] p-4">
                    <p className="text-[0.82rem] text-[var(--sm-mut)]">{c.k}</p>
                    <p className={`mt-1 font-display text-[1.35rem] leading-tight ${c.cls}`} style={c.cls.startsWith("var") || c.cls.startsWith("#") ? { color: c.cls } : undefined}>
                      {c.v}
                    </p>
                    <p className="mt-1 text-[0.8rem] text-[var(--sm-egg2)]">{c.sub}</p>
                  </div>
                ));
              })()}
            </section>

            {/* VN-Index + giai đoạn */}
            <section aria-label="VN-Index và giai đoạn thị trường" className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[1.6rem] leading-tight">VN-Index và giai đoạn thị trường</h2>
                  <p className="mt-1 text-[0.92rem] text-[var(--sm-egg2)]">
                    {range === "all" ? "Mỗi điểm một tháng" : "Mỗi điểm một tuần"}, {my(d.weeks[0])} – {my(d.weeks[view.last])}
                    {range === "all" ? " (thang logarit)" : ""}. Nền màu là giai đoạn: xét giá so với MA150 và độ dốc MA150, MA50 so với MA150.
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-[var(--sm-egg2)]">
                  {([1, 2, 3, 4] as const).map((s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <i className="inline-block h-3 w-4 rounded-sm border border-[var(--sm-line)]" style={{ background: STAGE[s].fill.replace(/0\.1\d?\)/, "0.45)") }} />
                      {STAGE[s].short}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-3">
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={view.chart} syncId="waves" margin={{ top: 8, right: 8, bottom: 0, left: 0 }} onMouseMove={(e) => setHover(e?.activeTooltipIndex != null ? Number(e.activeTooltipIndex) : null)} onMouseLeave={() => setHover(null)}>
                      <CartesianGrid vertical={false} stroke="var(--sm-line2)" />
                      {view.bands.map((b) => (
                        <ReferenceArea key={b.x1} x1={b.x1} x2={b.x2} fill={STAGE[b.s].fill} fillOpacity={1} ifOverflow="extendDomain" />
                      ))}
                      <XAxis dataKey="t" tickFormatter={range === "all" ? (t: string) => t.slice(0, 4) : my} tick={{ fontSize: 11, fill: "var(--sm-mut)" }} tickLine={false} axisLine={{ stroke: "var(--sm-line)" }} minTickGap={36} />
                      <YAxis scale={range === "all" ? "log" : "auto"} domain={["auto", "auto"]} allowDataOverflow={false} orientation="right" width={52} tick={{ fontSize: 11, fill: "var(--sm-mut)" }} tickLine={false} axisLine={false} tickFormatter={(v) => vn(v)} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as (typeof view.chart)[number];
                          return (
                            <div className="rounded-md border border-[rgba(201,162,74,0.45)] bg-[var(--sm-pop)] px-3 py-2 text-[0.8rem] shadow-lg">
                              <b>{range === "all" ? `Tháng ${my(p.t)}` : `Tuần ${dmy(p.t)}`}</b>
                              <div className="tabular-nums">VN-Index {vn(p.close, 2)}</div>
                              {p.stage && <div style={{ color: STAGE[p.stage].text }}>{STAGE[p.stage].label}</div>}
                              <div className="text-[var(--sm-egg2)]">
                                MA50 {p.ma50 ? vn(p.ma50) : "—"} · MA150 {p.ma150 ? vn(p.ma150) : "—"} · MA200 {p.ma200 ? vn(p.ma200) : "—"}
                              </div>
                              <div className="mt-1">
                                Ngành có sóng: <b>{p.waves}</b> · Toàn thị trường đạt: <b>{p.breadth == null ? "—" : `${vn(p.breadth, 1)}%`}</b>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line dataKey="ma200" stroke="#a14fc4" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                      <Line dataKey="ma150" stroke="#2f7fd6" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                      <Line dataKey="ma50" stroke="#d08a1e" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                      <Line dataKey="close" stroke="var(--sm-egg)" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 px-1 text-[0.78rem] text-[var(--sm-egg2)]">
                  <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-5 bg-[var(--sm-egg)]" />VN-Index</span>
                  <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-5 bg-[#d08a1e]" />MA50</span>
                  <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-5 bg-[#2f7fd6]" />MA150</span>
                  <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-5 bg-[#a14fc4]" />MA200</span>
                </div>

                <div className="mt-3 border-t border-[var(--sm-line2)] pt-2">
                  <p className="px-1 text-[0.82rem] font-semibold text-[var(--sm-egg)]">
                    Số ngành có sóng (cột) và % toàn thị trường đạt Trend Template (đường)
                  </p>
                  <div className="h-[130px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={view.chart} syncId="waves" margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--sm-line2)" />
                        <XAxis dataKey="t" hide />
                        <YAxis yAxisId="w" allowDecimals={false} width={28} tick={{ fontSize: 10, fill: "var(--sm-mut)" }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="b" orientation="right" width={52} domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--sm-mut)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={() => null} cursor={{ fill: "rgba(201,162,74,0.08)" }} />
                        <ReferenceLine yAxisId="b" y={d.threshold} stroke="rgba(201,162,74,0.5)" strokeDasharray="3 3" />
                        <Bar yAxisId="w" dataKey="waves" fill="#1f9d63" isAnimationActive={false} />
                        <Line yAxisId="b" dataKey="breadth" stroke="var(--sm-gold)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            {/* Bản đồ nhiệt */}
            <section aria-label="Bản đồ sóng ngành" className="mt-10">
              <h2 className="text-[1.6rem] leading-tight">Bản đồ sóng ngành</h2>
              <p className="mt-1 max-w-[52rem] text-[0.92rem] text-[var(--sm-egg2)]">
                Mỗi ô là {range === "all" ? "một tháng" : "một tuần"}: màu càng đậm thì càng nhiều mã trong ngành đạt Trend Template. Ô có viền vàng là tuần ngành có sóng (từ {d.threshold}%). Dải ô đậm kéo dài
                theo chiều ngang là một con sóng ngành; nhiều dải cùng lúc là thị trường có sóng lan tỏa. Ô trống là giai đoạn ngành chưa có đủ 3 mã niêm yết đủ dữ liệu (thường là những năm đầu thị trường).
              </p>
              <div className="mt-3 overflow-x-auto rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-3">
                <div className="min-w-[980px]">
                  {/* trục tháng */}
                  <div className="relative flex items-end pl-[11.5rem] pr-[13rem]">
                    <span className="absolute right-0 bottom-0 flex w-[13rem] items-center gap-1.5 pl-2 text-[0.72rem] font-semibold text-[var(--sm-egg2)]">
                      {live?.intraday ? (
                        <>
                          <i className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sm-up)]" aria-hidden="true" />
                          Trong phiên · {liveTime}
                        </>
                      ) : (
                        <>Phiên {dmy(d.sessionDate)}</>
                      )}
                    </span>
                    <div className="relative h-4 flex-1">
                      {d.weeks.map((w, i) =>
                        i === 0 || w.slice(5, 7) !== d.weeks[i - 1].slice(5, 7) ? (
                          ((w.slice(5, 7) === "01" && (range !== "all" || Number(w.slice(0, 4)) % 2 === 0)) || (i === 0 && !d.weeks.slice(0, 10).some((x) => x.slice(5, 7) === "01"))) && (
                            <span key={w} className="absolute bottom-0 text-[0.68rem] text-[var(--sm-mut)]" style={{ left: `${(i / view.n) * 100}%` }}>
                              {w.slice(0, 4)}
                            </span>
                          )
                        ) : null,
                      )}
                    </div>
                  </div>
                  {view.rows.map((s) => {
                    const lv = liveOf.get(s.sector);
                    const closedNow = raw!.sectors.find((x) => x.sector === s.sector)?.pct[raw!.weeks.length - 1] ?? null;
                    const cur = lv ? lv.pct : s.pct[view.last];
                    // trong phiên: so với phiên đã đóng; ngoài phiên: so với 4 tuần trước
                    const ch = live?.intraday ? (cur != null && closedNow != null ? cur - closedNow : null) : (ch4[s.sector] ?? null);
                    const leadersNow = lv ? lv.leaders : s.leaders;
                    return (
                      <div key={s.sector} className="flex items-center gap-2 py-[3px]">
                        <span className="w-[11rem] shrink-0 truncate text-[0.84rem] text-[var(--sm-egg)]" title={`${s.sector} · ${s.n} mã`}>
                          {s.sector}
                        </span>
                        <div className={`flex h-5 flex-1 ${range === "all" ? "" : "gap-px"}`}>
                          {s.pct.map((p, w) => (
                            <span
                              key={w}
                              className={`h-full flex-1 ${range === "all" ? "" : "rounded-[1px]"}`}
                              style={{
                                background: cellColor(p),
                                outline: p != null && p >= d.threshold ? "1px solid rgba(201,162,74,0.85)" : undefined,
                                outlineOffset: -1,
                                opacity: hover != null && hover !== w ? 0.75 : 1,
                              }}
                              title={`${s.sector} · ${range === "all" ? "tháng" : "tuần"} ${range === "all" ? my(d.weeks[w]) : dmy(d.weeks[w])}: ${p == null ? "chưa đủ dữ liệu" : `${vn(p, 0)}% mã đạt Trend Template`}${s.highs[w] ? ` · ${s.highs[w]} mã lập đỉnh 52 tuần` : ""}`}
                            />
                          ))}
                        </div>
                        <span className="w-[13rem] shrink-0 pl-2 text-[0.8rem] tabular-nums">
                          <b className={cur != null && cur >= d.threshold ? "up" : "text-[var(--sm-egg)]"}>{cur == null ? "—" : `${vn(cur, 0)}%`}</b>
                          {ch != null && (
                            <span className={`ml-1.5 ${ch > 0 ? "up" : ch < 0 ? "down" : "text-[var(--sm-mut)]"}`}>
                              {ch > 0 ? "▲" : ch < 0 ? "▼" : "·"} {vn(Math.abs(ch), 0)}
                            </span>
                          )}
                          <span className="ml-1.5 text-[var(--sm-mut)]" title={leadersNow.join(", ")}>
                            {leadersNow.slice(0, 3).join(" ")}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-2 flex items-center gap-2 pl-[11.5rem] text-[0.75rem] text-[var(--sm-mut)]">
                    0%
                    <span className="flex h-2.5 w-40 overflow-hidden rounded-sm">
                      {[0, 20, 40, 60, 80, 100].map((p) => (
                        <i key={p} className="block h-full flex-1" style={{ background: cellColor(p) }} />
                      ))}
                    </span>
                    100% số mã trong ngành đạt Trend Template · cột phải: hiện tại (trong phiên tính theo giá khớp, cập nhật 30 giây), thay đổi điểm % (trong phiên: so với phiên trước; ngoài giờ: so với 4 tuần trước), mã đang đạt
                  </div>
                </div>
              </div>
            </section>

            {/* Cách đọc */}
            <section aria-label="Cách đọc" className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-5 text-[0.92rem] leading-relaxed text-[var(--sm-egg2)]">
                <h3 className="text-[1.15rem] text-[var(--sm-egg)]">Trend Template là gì</h3>
                <p className="mt-1.5">Bộ lọc xu hướng của Mark Minervini. Một mã đạt khi đủ cả:</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                  <li>Giá &gt; MA50 &gt; MA150 &gt; MA200</li>
                  <li>MA200 đi lên so với 1 tháng trước</li>
                  <li>Giá cao hơn đáy 52 tuần ít nhất 30%</li>
                  <li>Giá cách đỉnh 52 tuần không quá 25%</li>
                </ul>
                <p className="mt-2 text-[0.82rem] text-[var(--sm-mut)]">Bản trên web dùng giá đóng cửa, chưa xét tiêu chí sức mạnh tương đối (RS).</p>
              </div>
              <div className="rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-5 text-[0.92rem] leading-relaxed text-[var(--sm-egg2)]">
                <h3 className="text-[1.15rem] text-[var(--sm-egg)]">Đọc thế nào</h3>
                <ul className="mt-1.5 list-disc space-y-1 pl-5">
                  <li>
                    <b className="text-[var(--sm-egg)]">Thị trường có sóng ngành</b> khi VN-Index ở giai đoạn 2 và có ít nhất một ngành vượt ngưỡng; càng nhiều ngành vượt ngưỡng
                    cùng lúc thì sóng càng lan tỏa.
                  </li>
                  <li>Sóng mới thường bắt đầu khi một ngành tăng nhanh % mã đạt (mũi tên ▲ lớn) trong lúc thị trường còn ở giai đoạn 1.</li>
                  <li>Sóng yếu dần khi % mã đạt giảm liên tục dù chỉ số vẫn cao, thường đi kèm VN-Index chuyển sang giai đoạn 3.</li>
                </ul>
                <p className="mt-2 text-[0.82rem] text-[var(--sm-mut)]">
                  Mô tả trạng thái theo dữ liệu quá khứ, phiên đã đóng; không dự báo, không phải khuyến nghị mua bán. Phân ngành theo nhóm của Bull Stock, gần 200 mã đang niêm yết hiện nay (mã đã hủy niêm yết không có trong dữ liệu).{" "}
                  <Link to="/tin-hieu" className="text-[var(--sm-gold2)] hover:underline">
                    Xem tín hiệu từng mã
                  </Link>
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
