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

function Scatter({ rows }: { rows: Row[] }) {
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
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Biểu đồ P/B theo ROE">
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
      {pts.map((p) => (
        <g key={p.bank}>
          <circle cx={sx(p.roe)} cy={sy(p.pb)} r="6" style={{ fill: GROUP_COLOR[groupOf(p.bank) ?? ""] ?? "var(--ab-accent)" }} opacity="0.9" />
        </g>
      ))}
      {labels.map((l) => (
        <text key={`l${l.bank}`} x={l.x} y={l.y} textAnchor={l.a} fontSize="12" fontWeight="700" style={{ fill: "var(--ab-strong)" }}>
          {l.bank}
        </text>
      ))}
    </svg>
  );
}

export default function BankValuationTab({ group }: { group: GroupFilter }) {
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
          <div className="overflow-x-auto"><div className="min-w-[540px]"><Scatter rows={rows} /></div></div>
        </div>
        <div className="border-[var(--ab-line)] lg:border-l lg:pl-6">
          <h3 className="font-bold text-[var(--ab-strong)]">Đọc biểu đồ</h3>
          <ul className="mt-1.5 list-disc pl-5 leading-relaxed">
            <li>Ngân hàng sinh lời tốt hơn (ROE cao) thường được thị trường trả P/B cao hơn.</li>
            <li>Nằm dưới đường xu hướng: P/B thấp hơn mức thường thấy ở cùng mức ROE. Nằm trên: cao hơn.</li>
            <li>Đường xu hướng chỉ tính các ngân hàng có ROE từ 8% trở lên.</li>
          </ul>
          <h3 className="mt-4 font-bold text-[var(--ab-strong)]">P/B và P/E là gì</h3>
          <p className="mt-1.5 leading-relaxed">
            P/B = giá cổ phiếu / giá trị sổ sách mỗi cổ phiếu. P/E = giá / lợi nhuận mỗi cổ phiếu 4 quý gần nhất. Với ngân hàng, P/B thường được dùng nhiều hơn.
          </p>
          <p className="mt-4 text-xs text-[var(--ab-muted)]">
            Nguồn: giá trị sổ sách, EPS, ROE và P/B lịch sử từ SSI (báo cáo tài chính đến Q3/2026); giá đang khớp cập nhật mỗi phút. Chỉ để tham khảo, không
            phải khuyến nghị mua bán.
          </p>
        </div>
      </section>
    </div>
  );
}
