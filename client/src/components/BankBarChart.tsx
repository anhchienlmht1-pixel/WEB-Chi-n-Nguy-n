import { useState } from "react";

// Biểu đồ cột dọc cho mục Quy mô & lợi nhuận: mỗi cột một ngân hàng (đã sắp
// xếp sẵn), trục giá trị bên phải, rê chuột/bấm để xem số. Có thể kèm một chuỗi
// thứ hai vẽ bằng tam giác (vd. tăng trưởng huy động cạnh tăng trưởng tín dụng).

export interface BarItem {
  bank: string;
  v: number;
  v2?: number;
}

function niceStep(span: number, target = 5) {
  const raw = span / target;
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

export default function BankBarChart({
  items,
  title,
  subtitle,
  fmt,
  axisFmt,
  label1,
  label2,
  signColor = false,
}: {
  items: BarItem[];
  title: string;
  subtitle: string;
  fmt: (n: number) => string;
  axisFmt: (n: number) => string;
  label1: string;
  label2?: string;
  /** Green above zero, red below (growth charts). */
  signColor?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (items.length === 0) return null;
  const W = 960;
  const H = 300;
  const P = { l: 12, r: 52, t: 16, b: 34 };
  const vals = items.flatMap((d) => (d.v2 != null ? [d.v, d.v2] : [d.v]));
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  const step = niceStep(hi - lo || 1);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil((hi * 1.04) / step) * step;
  const y = (v: number) => P.t + ((hi - v) / (hi - lo || 1)) * (H - P.t - P.b);
  const slot = (W - P.l - P.r) / items.length;
  const bw = Math.min(34, slot * 0.58);
  const cx = (i: number) => P.l + slot * i + slot / 2;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(+t.toFixed(10));
  const cur = hover != null ? items[hover] : null;
  const barColor = (v: number, on: boolean) =>
    signColor ? (v >= 0 ? "var(--heat-up)" : "var(--heat-down)") : on ? "var(--ab-strong)" : "var(--ab-accent)";

  return (
    <section className="rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] px-4 pt-4 pb-3">
      <div className="text-center">
        <h2 className="text-lg font-bold text-[var(--ab-strong)]">{title}</h2>
        <p className="text-[0.82rem] text-[var(--ab-muted)]">{subtitle}</p>
      </div>
      <div className="relative mt-2 overflow-x-auto sm:overflow-visible" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[640px] sm:min-w-0" role="img" aria-label={title}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} style={{ stroke: t === 0 ? "var(--ab-line-strong)" : "var(--ab-line)" }} />
              <text x={W - P.r + 8} y={y(t) + 4} fontSize="11" style={{ fill: "var(--ab-muted)" }}>
                {axisFmt(t)}
              </text>
            </g>
          ))}
          {items.map((d, i) => {
            const on = hover === i;
            const y0 = y(0);
            const yv = y(d.v);
            return (
              <g
                key={d.bank}
                className="cursor-pointer"
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(on ? null : i)}
                role="button"
                tabIndex={0}
                aria-label={`${d.bank}: ${fmt(d.v)}${d.v2 != null && label2 ? `, ${label2} ${fmt(d.v2)}` : ""}`}
                onFocus={() => setHover(i)}
              >
                <rect x={P.l + slot * i} y={P.t} width={slot} height={H - P.t - P.b} fill="transparent" />
                {on && <rect x={P.l + slot * i} y={P.t} width={slot} height={H - P.t - P.b} style={{ fill: "var(--ab-hover)" }} />}
                <rect
                  x={cx(i) - bw / 2}
                  y={Math.min(y0, yv)}
                  width={bw}
                  height={Math.max(1, Math.abs(yv - y0))}
                  rx="2"
                  style={{ fill: barColor(d.v, on) }}
                  opacity={hover == null || on ? 0.9 : 0.55}
                />
                {d.v2 != null && (
                  <path
                    d={`M${cx(i)},${y(d.v2) - 6} l6,10 h-12 z`}
                    style={{ fill: "#e07b39", stroke: "var(--ab-card)" }}
                    strokeWidth="1"
                  />
                )}
                <text
                  x={cx(i)}
                  y={H - P.b + 18}
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight={on ? 700 : 600}
                  style={{ fill: on ? "var(--ab-strong)" : "var(--ab-text)" }}
                >
                  {d.bank}
                </text>
              </g>
            );
          })}
        </svg>
        {cur && hover != null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[170px] rounded-lg border border-[var(--ab-line-strong)] bg-[var(--ab-bg2)] px-3 py-2 text-[0.82rem] shadow-lg"
            style={{
              left: `clamp(0px, calc(${(cx(hover) / W) * 100}% ${cx(hover) > W * 0.6 ? "- 182px" : "+ 14px"}), calc(100% - 180px))`,
            }}
          >
            <b className="text-[var(--ab-strong)]">{cur.bank}</b>
            <p className="mt-1 flex items-center justify-between gap-3 tabular-nums">
              <span className="flex items-center gap-1.5 text-[var(--ab-muted)]">
                <i className="inline-block h-2 w-2 rounded-sm" style={{ background: barColor(cur.v, false) }} />
                {label1}
              </span>
              <b>{fmt(cur.v)}</b>
            </p>
            {cur.v2 != null && label2 && (
              <p className="flex items-center justify-between gap-3 tabular-nums">
                <span className="flex items-center gap-1.5 text-[var(--ab-muted)]">
                  <i className="inline-block h-2 w-2" style={{ background: "#e07b39", clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
                  {label2}
                </span>
                <b>{fmt(cur.v2)}</b>
              </p>
            )}
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-center gap-5 text-[0.8rem] text-[var(--ab-muted)]">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: signColor ? "var(--heat-up)" : "var(--ab-accent)" }} />
          {label1}
        </span>
        {label2 && (
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5" style={{ background: "#e07b39", clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
            {label2}
          </span>
        )}
      </div>
    </section>
  );
}

