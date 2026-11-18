import { useState } from "react";
import type React from "react";
import { Link } from "react-router-dom";
import { usePolling } from "../hooks/usePolling";
import { fetchQuote } from "../api/client";
import { VALUATION } from "../data/bankValuation";
import { Tile, banksIn, groupOf, heat, mean, stats, vn, type GroupFilter } from "./bankUi";
import type { Quote } from "../types";

// Định giá: P/B, P/E theo giá đang khớp (giá / giá trị sổ sách, giá / EPS 4 quý),
// so với P/B của chính ngân hàng đó từ 2022, và biểu đồ P/B – ROE.

const ALL = Object.keys(VALUATION);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};
const GROUP_COLOR: Record<string, string> = { SOBs: "#e07b39", "NHTM lớn": "var(--heat-up)", "NHTM vừa": "#5b8def" };

interface Row {
  bank: string;
  price: number | null;
  chPct: number | null;
  pb: number;
  pe: number;
  roe: number;
  avg: number;
  min: number;
  max: number;
  vsHist: number; // % P/B now vs own average
}

function RangeBar({ r }: { r: Row }) {
  const lo = Math.min(r.min, r.pb);
  const hi = Math.max(r.max, r.pb);
  const span = hi - lo || 1;
  const x = (v: number) => `${((v - lo) / span) * 100}%`;
  return (
    <div className="relative mx-auto h-4 w-[150px]" title={`P/B thấp nhất ${vn(r.min)} · TB ${vn(r.avg)} · cao nhất ${vn(r.max)} · hiện tại ${vn(r.pb)}`}>
      <span className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--ab-line-strong)]" style={{ left: x(r.min), right: `calc(100% - ${x(r.max)})` }} />
      <span className="absolute top-0 h-4 w-px bg-[#e07b39]" style={{ left: x(r.avg) }} />
      <span
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--ab-bg)]"
        style={{ left: x(r.pb), background: r.vsHist <= 0 ? "var(--heat-up)" : "var(--heat-down)" }}
      />
    </div>
  );
}

interface ScatterProps {
  rows: Row[];
  roeMin: number;
  pbAvg: number;
  watch: Set<string>;
  sel: string | null;
  onSel: (b: string | null) => void;
}

function Scatter({ rows, roeMin, pbAvg, watch, sel, onSel }: ScatterProps) {
  const pts = rows.filter((r) => r.roe > 0 && r.pb > 0);
  if (pts.length < 3) return null;
  const W = 640;
  const H = 360;
  const P = { l: 46, r: 16, t: 14, b: 36 };
  const xMax = Math.max(...pts.map((p) => p.roe)) * 1.08;
  const yMax = Math.max(...pts.map((p) => p.pb)) * 1.12;
  const sx = (v: number) => P.l + (v / xMax) * (W - P.l - P.r);
  const sy = (v: number) => H - P.b - (v / yMax) * (H - P.t - P.b);
  // Trend line through banks with normal earnings (ROE ≥ 8%).
  const fit = pts.filter((p) => p.roe >= 8);
  let line: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (fit.length >= 3) {
    const mx = mean(fit.map((p) => p.roe));
    const my = mean(fit.map((p) => p.pb));
    const b = fit.reduce((a, p) => a + (p.roe - mx) * (p.pb - my), 0) / (fit.reduce((a, p) => a + (p.roe - mx) ** 2, 0) || 1);
    const a = my - b * mx;
    const x1 = 8;
    const x2 = xMax / 1.08;
    line = { x1: sx(x1), y1: sy(a + b * x1), x2: sx(x2), y2: sy(a + b * x2) };
  }
  // Place each label right of its dot; if it would overlap a label already placed,
  // try left, above, below.
  const placed: { x: number; y: number; w: number }[] = [];
  const labels = pts.map((p) => {
    const cx = sx(p.roe);
    const cy = sy(p.pb);
    const w = p.bank.length * 8 + 2;
    const tries = [
      { x: cx + 9, y: cy + 4, a: "start" as const },
      { x: cx - 9, y: cy + 4, a: "end" as const },
      { x: cx, y: cy - 10, a: "middle" as const },
      { x: cx, y: cy + 19, a: "middle" as const },
    ];
    const box = (t: (typeof tries)[number]) => ({ x: t.a === "start" ? t.x : t.a === "end" ? t.x - w : t.x - w / 2, y: t.y, w });
    const hit = (b: { x: number; y: number; w: number }) =>
      placed.some((o) => Math.abs(o.y - b.y) < 13 && b.x < o.x + o.w && o.x < b.x + b.w) ||
      pts.some((q) => q !== p && Math.abs(sy(q.pb) - (b.y - 4)) < 7 && sx(q.roe) > b.x - 6 && sx(q.roe) < b.x + b.w + 6);
    const t = tries.find((t) => !hit(box(t))) ?? tries[0];
    placed.push(box(t));
    return { bank: p.bank, ...t };
  });
  const xt = [0, 5, 10, 15, 20, 25, 30].filter((v) => v <= xMax);
  const yt = [0, 0.5, 1, 1.5, 2, 2.5, 3].filter((v) => v <= yMax);
  const cur = pts.find((p) => p.bank === sel) ?? null;
  const zx = sx(Math.min(roeMin, xMax));
  const zy = sy(Math.min(pbAvg, yMax));
  return (
    <div className="relative" onMouseLeave={() => onSel(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Biểu đồ P/B theo ROE">
      {/* Vùng lọc: ROE ≥ ngưỡng và P/B dưới TB ngành */}
      <rect x={zx} y={zy} width={W - P.r - zx} height={H - P.b - zy} style={{ fill: "var(--heat-up)" }} opacity="0.09" />
      <line x1={zx} x2={zx} y1={P.t} y2={H - P.b} strokeDasharray="3 3" style={{ stroke: "var(--heat-up)" }} opacity="0.7" />
      <line x1={P.l} x2={W - P.r} y1={zy} y2={zy} strokeDasharray="3 3" style={{ stroke: "var(--heat-up)" }} opacity="0.7" />
      <text x={W - P.r - 4} y={H - P.b - 6} textAnchor="end" fontSize="11" style={{ fill: "var(--heat-up)" }}>
        ROE trên TB ngành ({vn(roeMin, 1)}%) · P/B dưới TB ngành ({vn(pbAvg)})
      </text>
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} style={{ stroke: "var(--ab-line)" }} />
          <text x={P.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--ab-muted)" }}>
            {vn(v, 1)}
          </text>
        </g>
      ))}
      {xt.map((v) => (
        <text key={`x${v}`} x={sx(v)} y={H - P.b + 16} textAnchor="middle" fontSize="11" style={{ fill: "var(--ab-muted)" }}>
          {v}%
        </text>
      ))}
      <text x={W - P.r} y={H - 4} textAnchor="end" fontSize="11" style={{ fill: "var(--ab-muted)" }}>
        ROE 4 quý →
      </text>
      <text x={4} y={P.t + 2} fontSize="11" style={{ fill: "var(--ab-muted)" }}>
        P/B
      </text>
      {line && (
        <line {...line} strokeWidth="1.5" strokeDasharray="5 4" style={{ stroke: "#e07b39" }} />
      )}
      {pts.map((p) => {
        const on = p.bank === sel;
        return (
          <g
            key={p.bank}
            role="button"
            tabIndex={0}
            aria-label={`${p.bank}: P/B ${vn(p.pb)}, ROE ${vn(p.roe, 1)}%`}
            className="cursor-pointer outline-none"
            onMouseEnter={() => onSel(p.bank)}
            onFocus={() => onSel(p.bank)}
            onClick={(e) => {
              e.stopPropagation();
              onSel(on ? null : p.bank);
            }}
          >
            <circle cx={sx(p.roe)} cy={sy(p.pb)} r="14" fill="transparent" />
            {watch.has(p.bank) && <circle cx={sx(p.roe)} cy={sy(p.pb)} r="8.5" fill="none" strokeWidth="1" style={{ stroke: "var(--heat-up)" }} opacity="0.85" />}
            <circle
              cx={sx(p.roe)}
              cy={sy(p.pb)}
              r={on ? 8 : 6}
              style={{ fill: GROUP_COLOR[groupOf(p.bank) ?? ""] ?? "var(--ab-accent)", stroke: on ? "var(--ab-strong)" : "none" }}
              strokeWidth="2"
              opacity="0.95"
            />
          </g>
        );
      })}
      {labels.map((l) => (
        <text key={`l${l.bank}`} x={l.x} y={l.y} textAnchor={l.a} fontSize="12" fontWeight="700" style={{ fill: "var(--ab-strong)" }}>
          {l.bank}
        </text>
      ))}
    </svg>
    {cur && (
      <div
        className="pointer-events-none absolute z-10 w-[230px] rounded-lg border border-[var(--ab-line-strong)] bg-[var(--ab-bg2)] p-3 text-[0.82rem] shadow-lg"
        style={{
          left: `clamp(0px, calc(${(sx(cur.roe) / W) * 100}% ${sx(cur.roe) > W * 0.6 ? "- 242px" : "+ 12px"}), calc(100% - 230px))`,
          top: `clamp(0px, calc(${(sy(cur.pb) / H) * 100}% - 60px), calc(100% - 200px))`,
        }}
      >
        <p className="flex items-baseline justify-between">
          <b className="text-base text-[var(--ab-strong)]">{cur.bank}</b>
          <span className="text-xs text-[var(--ab-muted)]">{groupOf(cur.bank)}</span>
        </p>
        <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
          <dt className="text-[var(--ab-muted)]">Giá</dt>
          <dd className="text-right">{cur.price ? vn(cur.price / 1000, 2) : "—"}</dd>
          <dt className="text-[var(--ab-muted)]">P/B</dt>
          <dd className="text-right font-bold">{vn(cur.pb)}</dd>
          <dt className="text-[var(--ab-muted)]">P/E</dt>
          <dd className="text-right">{cur.pe > 0 && cur.pe < 40 ? vn(cur.pe, 1) : `${vn(cur.pe, 0)}*`}</dd>
          <dt className="text-[var(--ab-muted)]">ROE 4 quý</dt>
          <dd className="text-right font-bold">{vn(cur.roe, 1)}%</dd>
          <dt className="text-[var(--ab-muted)]">P/B TB từ 2022</dt>
          <dd className="text-right">{vn(cur.avg)}</dd>
          <dt className="text-[var(--ab-muted)]">So với TB của mình</dt>
          <dd className="text-right" style={{ color: cur.vsHist <= 0 ? "var(--heat-up)" : "var(--heat-down)" }}>
            {cur.vsHist > 0 ? "+" : "−"}
            {vn(Math.abs(cur.vsHist), 0)}%
          </dd>
          <dt className="text-[var(--ab-muted)]">So với P/B TB ngành</dt>
          <dd className="text-right" style={{ color: cur.pb <= pbAvg ? "var(--heat-up)" : "var(--heat-down)" }}>
            {cur.pb > pbAvg ? "+" : "−"}
            {vn(Math.abs((cur.pb / pbAvg - 1) * 100), 0)}%
          </dd>
        </dl>
        {watch.has(cur.bank) && <p className="mt-1.5 text-xs font-bold text-[var(--heat-up)]">✓ Trong danh sách theo dõi</p>}
      </div>
    )}
    </div>
  );
}

export default function BankValuationTab({ group }: { group: GroupFilter }) {
  const [sel, setSel] = useState<string | null>(null);
  const { data: quotes } = usePolling(
    async () => {
      const res = await Promise.allSettled(ALL.map((s) => fetchQuote(s)));
      const out: Record<string, Quote> = {};
      res.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value?.price > 0) out[ALL[i]] = r.value;
      });
      return out;
    },
    [],
    60 * 1000,
  );
  const live = quotes && Object.keys(quotes).length > 0;

  const all: Row[] = ALL.map((bank) => {
    const v = VALUATION[bank];
    const q = quotes?.[bank];
    // Quotes may come in VND or in thousands of VND depending on the feed.
    const price = q ? (q.price < 1000 ? q.price * 1000 : q.price) : null;
    const pb = price ? price / v.bvps : v.pbQ3;
    return {
      bank,
      price,
      chPct: q ? q.changePercent : null,
      pb,
      pe: price ? price / v.eps : v.pbQ3 * (v.bvps / v.eps),
      roe: v.roe,
      avg: v.pbAvg,
      min: v.pbMin,
      max: v.pbMax,
      vsHist: (pb / v.pbAvg - 1) * 100,
    };
  });
  const shown = new Set(banksIn(group));
  const rows = all.filter((r) => shown.has(r.bank)).sort((a, b) => a.vsHist - b.vsHist);

  const pbStat = stats(all.map((r) => r.pb));
  const peOk = all.filter((r) => r.pe > 0 && r.pe < 40).map((r) => r.pe);
  const peStat = stats(peOk);
  const roeStat = stats(all.map((r) => r.roe));
  const histStat = stats(all.map((r) => r.vsHist));
  const below = rows.filter((r) => r.vsHist < 0).length;
  const pbAvgAll = mean(all.map((r) => r.pb));
  // Watch list: ROE above the 16-bank average and P/B below the 16-bank average.
  const roeMin = mean(all.map((r) => r.roe));
  const watch = rows.filter((r) => r.roe > roeMin && r.pb < pbAvgAll).sort((a, b) => a.pb / a.roe - b.pb / b.roe);
  const watchSet = new Set(watch.map((r) => r.bank));

  const cell = (style: React.CSSProperties | undefined) => ({ className: "px-2 py-1.5 text-center tabular-nums", style });

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Tổng quan định giá" className="flex flex-wrap rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <Tile label="P/B trung vị" value={vn(median(rows.map((r) => r.pb)))} sub={`${rows.length} ngân hàng · ${live ? "theo giá đang khớp" : "theo giá cuối quý"}`} />
        <Tile label="P/E trung vị" value={vn(median(rows.filter((r) => r.pe > 0 && r.pe < 40).map((r) => r.pe)), 1)} sub="Bỏ qua ngân hàng lợi nhuận quá thấp (P/E > 40)" />
        <Tile label="ROE trung bình (4 quý)" value={`${vn(mean(rows.map((r) => r.roe)), 1)}%`} sub="Lợi nhuận trên vốn chủ sở hữu" />
        <Tile label="P/B dưới mức TB lịch sử" value={`${below}/${rows.length}`} sub="So với P/B cuối các quý từ 2022" />
      </section>

      <section className="overflow-x-auto rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)]">
        <table className="w-full min-w-[980px] border-collapse text-[0.92rem]">
          <thead>
            <tr className="bg-[var(--ab-accent)] text-[var(--ab-bg)]">
              <th className="px-3 py-2.5 text-left font-bold">Ngân hàng</th>
              <th className="px-2 py-2.5 font-bold">Giá</th>
              <th className="px-2 py-2.5 font-bold" title="Giá / giá trị sổ sách mỗi cổ phiếu (Q3/2026)">P/B</th>
              <th className="px-2 py-2.5 font-bold" title="Giá / lợi nhuận mỗi cổ phiếu 4 quý gần nhất">P/E</th>
              <th className="px-2 py-2.5 font-bold">ROE 4 quý</th>
              <th className="px-2 py-2.5 font-bold">P/B TB từ 2022</th>
              <th className="px-2 py-2.5 font-bold">So với TB</th>
              <th className="px-2 py-2.5 font-bold">P/B: thấp nhất — cao nhất</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const zPb = (r.pb - pbStat.m) / pbStat.sd;
              const zPe = (r.pe - peStat.m) / peStat.sd;
              const zRoe = (r.roe - roeStat.m) / roeStat.sd;
              const zH = (r.vsHist - histStat.m) / histStat.sd;
              const peBad = !(r.pe > 0 && r.pe < 40);
              return (
                <tr key={r.bank} className="border-t border-[var(--ab-line)]">
                  <td className="px-3 py-1.5">
                    <Link to={`/stock/${r.bank}`} className="font-bold text-[var(--ab-strong)] hover:underline">
                      {r.bank}
                    </Link>
                    <span className="ml-2 text-xs text-[var(--ab-muted)]">{groupOf(r.bank)}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums">
                    {r.price ? vn(r.price / 1000, 2) : "—"}
                    {r.chPct != null && (
                      <span className="ml-1.5 text-xs" style={{ color: r.chPct > 0 ? "var(--ab-up)" : r.chPct < 0 ? "var(--ab-down)" : "#e0b24a" }}>
                        {r.chPct > 0 ? "+" : ""}
                        {vn(r.chPct, 1)}%
                      </span>
                    )}
                  </td>
                  <td {...cell(heat(-zPb, zPb))}>{vn(r.pb)}</td>
                  <td {...cell(peBad ? heat(-1, 2) : heat(-zPe, zPe))}>{peBad ? `${vn(r.pe, 0)}*` : vn(r.pe, 1)}</td>
                  <td {...cell(heat(zRoe, zRoe))}>{vn(r.roe, 1)}%</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{vn(r.avg)}</td>
                  <td {...cell(heat(-r.vsHist, Math.max(Math.abs(zH), Math.abs(r.vsHist) / 15)))}>
                    {r.vsHist > 0 ? "+" : r.vsHist < 0 ? "−" : ""}
                    {vn(Math.abs(r.vsHist), 0)}%
                  </td>
                  <td className="px-2 py-1.5">
                    <RangeBar r={r} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="-mt-1 text-[0.8rem] leading-relaxed text-[var(--ab-muted)]">
        Xanh: P/B, P/E thấp hơn mặt bằng ngành hoặc thấp hơn mức TB của chính ngân hàng; ROE cao hơn. Đỏ: ngược lại. Màu chỉ mô tả số liệu, không
        phải khuyến nghị mua bán. * P/E rất cao vì lợi nhuận 4 quý gần nhất quá thấp. Dải P/B: chấm tròn = hiện tại, vạch cam = trung bình.
        {!live && " Chưa lấy được giá đang khớp: đang dùng P/B, P/E cuối quý 3/2026."}
      </p>

      <section className="grid gap-7 rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[var(--ab-strong)]">P/B so với ROE</h2>
          <div className="mt-1 mb-2 flex flex-wrap gap-4 text-[0.8rem] text-[var(--ab-muted)]">
            {Object.entries(GROUP_COLOR).map(([g, c]) => (
              <span key={g} className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                {g}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-0 w-4 border-t-2 border-dashed border-[#e07b39]" />
              Đường xu hướng
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[540px]">
              <Scatter rows={rows} roeMin={roeMin} pbAvg={pbAvgAll} watch={watchSet} sel={sel} onSel={setSel} />
            </div>
          </div>
          <details className="mt-3 text-[0.88rem]">
            <summary className="cursor-pointer font-bold text-[var(--ab-strong)]">Cách đọc biểu đồ</summary>
            <ul className="mt-1.5 list-disc pl-5 leading-relaxed">
              <li>Rê chuột hoặc bấm vào chấm để xem số liệu của ngân hàng.</li>
              <li>Ngân hàng sinh lời tốt hơn (ROE cao) thường được thị trường trả P/B cao hơn.</li>
              <li>Nằm dưới đường xu hướng: P/B thấp hơn mức thường thấy ở cùng mức ROE. Nằm trên: cao hơn.</li>
              <li>Vùng xanh nhạt: ROE trên trung bình ngành và P/B dưới trung bình ngành. Chấm có vòng xanh: nằm trong danh sách theo dõi.</li>
              <li>P/B = giá / giá trị sổ sách mỗi cổ phiếu. P/E = giá / lợi nhuận mỗi cổ phiếu 4 quý gần nhất.</li>
            </ul>
          </details>
        </div>
        <aside aria-label="Danh sách theo dõi" className="flex flex-col border-[var(--ab-line)] lg:border-l lg:pl-6">
          <h3 className="text-lg font-bold text-[var(--ab-strong)]">Danh sách theo dõi</h3>
          <p className="mt-1 text-[0.85rem] text-[var(--ab-muted)]">
            Ngân hàng có ROE 4 quý <b>cao hơn</b> trung bình ngành <b>và</b> P/B <b>thấp hơn</b> trung bình ngành (tính trên 16 ngân hàng).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[0.82rem]">
            <div className="rounded-lg border border-[var(--ab-line)] px-3 py-2">
              <span className="text-[var(--ab-muted)]">ROE TB ngành</span>
              <b className="block text-lg tabular-nums text-[var(--ab-strong)]">{vn(roeMin, 1)}%</b>
            </div>
            <div className="rounded-lg border border-[var(--ab-line)] px-3 py-2">
              <span className="text-[var(--ab-muted)]">P/B TB ngành</span>
              <b className="block text-lg tabular-nums text-[var(--ab-strong)]">{vn(pbAvgAll)}</b>
            </div>
          </div>
          {watch.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-[var(--ab-line-strong)] p-4 text-[0.88rem]">
              Chưa có ngân hàng nào đạt cả hai điều kiện{group !== "Tất cả" ? ` trong nhóm ${group}` : ""}. 
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5">
              {watch.map((r) => {
                const on = r.bank === sel;
                return (
                  <li key={r.bank}>
                    <div
                      onMouseEnter={() => setSel(r.bank)}
                      onMouseLeave={() => setSel(null)}
                      className={`grid grid-cols-[3.2rem_1fr_auto] items-center gap-x-3 rounded-lg border px-3 py-2 transition-colors ${
                        on ? "border-[var(--heat-up)] bg-[var(--ab-hover)]" : "border-[var(--ab-line)]"
                      }`}
                    >
                      <Link to={`/stock/${r.bank}`} className="font-bold text-[var(--ab-strong)] hover:underline">
                        {r.bank}
                      </Link>
                      <span className="text-[0.82rem] tabular-nums">
                        ROE <b>{vn(r.roe, 1)}%</b> <span style={{ color: "var(--heat-up)" }}>(+{vn(r.roe - roeMin, 1)})</span> · P/B <b>{vn(r.pb)}</b>
                      </span>
                      <span className="text-right text-xs tabular-nums" style={{ color: "var(--heat-up)" }}>
                        −{vn(Math.abs((r.pb / pbAvgAll - 1) * 100), 0)}% so ngành
                      </span>
                      <span className="col-span-3 mt-0.5 text-xs text-[var(--ab-muted)]">
                        {groupOf(r.bank)} · P/B {r.vsHist <= 0 ? "thấp" : "cao"} hơn TB của chính nó {vn(Math.abs(r.vsHist), 0)}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 rounded-lg bg-[var(--ab-hover)] p-3 text-[0.82rem] leading-relaxed">
            <b className="text-[var(--ab-strong)]">ROE bao nhiêu là ổn?</b> Với ngân hàng Việt Nam, mốc hay dùng là khoảng 15%: cao hơn chi phí vốn chủ sở hữu
            ước tính (khoảng 12–14%), tức ngân hàng tạo thêm giá trị cho cổ đông. ROE trung bình 16 ngân hàng hiện là {vn(roeMin, 1)}%, nên mốc lọc theo trung bình ngành cũng nằm quanh mức này.
          </div>
          <p className="mt-3 text-xs text-[var(--ab-muted)]">
            Danh sách lọc tự động theo hai tiêu chí trên (trung bình tính lại theo giá), cập nhật theo giá mỗi phút; P/B thấp có thể do rủi ro riêng (nợ xấu, tăng vốn…). Đây không phải khuyến
            nghị mua bán. Nguồn: SSI, báo cáo tài chính đến Q3/2026.
          </p>
        </aside>
      </section>
    </div>
  );
}
