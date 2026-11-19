import { useState, type ReactNode } from "react";

// Biểu đồ cột dọc cho mục Quy mô & lợi nhuận: mỗi cột một ngân hàng (đã sắp
// xếp sẵn), rê chuột/bấm để xem số. Chuỗi thứ hai (v2) vẽ được 2 kiểu:
//  - "triangle": tam giác cùng trục với cột (vd. huy động cạnh tín dụng, cùng %)
//  - "dot":      chấm tròn trên trục riêng bên trái (vd. tăng trưởng % cạnh lợi
//                nhuận nghìn tỷ); hai trục luôn khớp mốc 0.

export interface BarItem {
  bank: string;
  v: number;
  v2?: number;
}

const NICE = [1, 2, 2.5, 5, 10];
function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  return (NICE.find((m) => m >= raw / p - 1e-9) ?? 10) * p;
}

/** Axis from -step*down to +step*up. */
interface Axis {
  step: number;
  up: number;
  down: number;
}

function singleAxis(vals: number[], steps = 5): Axis {
  const pos = Math.max(0, ...vals);
  const neg = Math.max(0, ...vals.map((v) => -v));
  const step = niceStep((pos + neg) / steps || 1);
  return { step, up: Math.max(1, Math.ceil((pos * 1.03) / step)), down: Math.ceil(neg / step) };
}

// Two axes sharing the same gridlines and the same zero line: try every split
// of N intervals above/below zero and keep the one that wastes least space.
function dualAxes(a: number[], b: number[], N = 6): [Axis, Axis] {
  const ext = (vs: number[]) => [Math.max(0, ...vs) * 1.03, Math.max(0, ...vs.map((v) => -v))];
  const [pa, na] = ext(a);
  const [pb, nb] = ext(b);
  let best: [Axis, Axis] | null = null;
  let bestWaste = Infinity;
  for (let k = 1; k <= N; k++) {
    const d = N - k;
    if ((na > 0 || nb > 0) && d === 0) continue;
    const sa = niceStep(Math.max(pa / k, d ? na / d : 0) || 1);
    const sb = niceStep(Math.max(pb / k, d ? nb / d : 0) || 1);
    const waste = (sa * N) / (pa + na || 1) + (sb * N) / (pb + nb || 1);
    if (waste < bestWaste) {
      bestWaste = waste;
      best = [
        { step: sa, up: k, down: d },
        { step: sb, up: k, down: d },
      ];
    }
  }
  return best ?? [singleAxis(a), singleAxis(b)];
}

export default function BankBarChart({
  items,
  title,
  subtitle,
  fmt,
  axisFmt,
  label1,
  label2,
  v2Kind = "triangle",
  fmt2,
  axisFmt2,
  signColor = false,
  controls,
  compact = false,
}: {
  items: BarItem[];
  title: string;
  subtitle: string;
  fmt: (n: number) => string;
  axisFmt: (n: number) => string;
  label1: string;
  label2?: string;
  v2Kind?: "triangle" | "dot";
  fmt2?: (n: number) => string;
  axisFmt2?: (n: number) => string;
  /** Green above zero, red below (growth bars). */
  signColor?: boolean;
  /** Extra buttons shown under the title (e.g. trước thuế / sau thuế). */
  controls?: ReactNode;
  /** Half-width layout (2 charts per row): narrower viewBox so text keeps its size. */
  compact?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (items.length === 0) return null;
  const dot = v2Kind === "dot";
  const has2 = items.some((d) => d.v2 != null);
  const W = compact ? 600 : 960;
  const H = compact ? 280 : 300;
  const P = { l: dot && has2 ? 52 : 8, r: compact ? 44 : 56, t: 16, b: 34 };
  const v1 = items.map((d) => d.v);
  const v2 = items.flatMap((d) => (d.v2 != null ? [d.v2] : []));
  // Triangles share the bars' axis; dots get their own (left) axis.
  const [ax1, ax2]: [Axis, Axis | null] = dot && has2 ? dualAxes(v1, v2) : [singleAxis(dot ? v1 : [...v1, ...v2]), null];
  const n = ax1.up + ax1.down;
  const zeroY = P.t + (ax1.up / n) * (H - P.t - P.b);
  const scale = (ax: Axis) => (v: number) => zeroY - (v / (ax.step * ax.up)) * (zeroY - P.t);
  const y = scale(ax1);
  const y2 = ax2 ? scale(ax2) : y;
  const slot = (W - P.l - P.r) / items.length;
  const bw = Math.min(34, slot * 0.58);
  const cx = (i: number) => P.l + slot * i + slot / 2;
  const grid = Array.from({ length: n + 1 }, (_, i) => ax1.up - i); // in steps, top → bottom
  const cur = hover != null ? items[hover] : null;
  const f2 = fmt2 ?? fmt;
  const barColor = (v: number, on: boolean) =>
    signColor ? (v >= 0 ? "var(--heat-up)" : "var(--heat-down)") : on ? "var(--ab-strong)" : "var(--ab-accent)";
  const dotColor = (v: number) => (v >= 0 ? "var(--heat-up)" : "var(--heat-down)");

  return (
    <section className="rounded-[10px] border border-[var(--ab-line)] bg-[var(--ab-card)] px-4 pt-4 pb-3">
      <div className="text-center">
        <h2 className="text-lg font-bold text-[var(--ab-strong)]">{title}</h2>
        <p className="text-[0.82rem] text-[var(--ab-muted)]">{subtitle}</p>
        {controls && <div className="mt-2 flex justify-center">{controls}</div>}
      </div>
      <div className="relative mt-2 overflow-x-auto sm:overflow-visible" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className={`block h-auto w-full ${compact ? "min-w-[520px]" : "min-w-[640px]"} sm:min-w-0`} role="img" aria-label={title}>
          {grid.map((k) => (
            <g key={k}>
              <line
                x1={P.l}
                x2={W - P.r}
                y1={y(k * ax1.step)}
                y2={y(k * ax1.step)}
                style={{ stroke: k === 0 ? "var(--ab-line-strong)" : "var(--ab-line)" }}
              />
              <text x={W - P.r + 8} y={y(k * ax1.step) + 4} fontSize="11" style={{ fill: "var(--ab-muted)" }}>
                {k < 0 && v1.every((v) => v >= 0) ? "" : axisFmt(k * ax1.step)}
              </text>
              {ax2 && (
                <text x={P.l - 8} y={y(k * ax1.step) + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--ab-muted)" }}>
                  {(axisFmt2 ?? axisFmt)(k * ax2.step)}
                </text>
              )}
            </g>
          ))}
          {items.map((d, i) => {
            const on = hover === i;
            const yv = y(d.v);
            return (
              <g
                key={d.bank}
                className="cursor-pointer"
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(on ? null : i)}
                role="button"
                tabIndex={0}
                aria-label={`${d.bank}: ${fmt(d.v)}${d.v2 != null && label2 ? `, ${label2} ${f2(d.v2)}` : ""}`}
                onFocus={() => setHover(i)}
              >
                <rect x={P.l + slot * i} y={P.t} width={slot} height={H - P.t - P.b} fill="transparent" />
                {on && <rect x={P.l + slot * i} y={P.t} width={slot} height={H - P.t - P.b} style={{ fill: "var(--ab-hover)" }} />}
                <rect
                  x={cx(i) - bw / 2}
                  y={Math.min(zeroY, yv)}
                  width={bw}
                  height={Math.max(1, Math.abs(yv - zeroY))}
                  rx="2"
                  style={{ fill: barColor(d.v, on) }}
                  opacity={hover == null || on ? 0.9 : 0.55}
                />
                {d.v2 != null &&
                  (dot ? (
                    <circle cx={cx(i)} cy={y2(d.v2)} r={on ? 6.5 : 5} style={{ fill: dotColor(d.v2), stroke: "var(--ab-card)" }} strokeWidth="1.5" />
                  ) : (
                    <path d={`M${cx(i)},${y(d.v2) - 6} l6,10 h-12 z`} style={{ fill: "#e07b39", stroke: "var(--ab-card)" }} strokeWidth="1" />
                  ))}
                <text
                  x={cx(i)}
                  y={H - P.b + 18}
                  textAnchor="middle"
                  fontSize={compact ? 11 : 11.5}
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
            className="pointer-events-none absolute top-2 z-10 min-w-[190px] rounded-lg border border-[var(--ab-line-strong)] bg-[var(--ab-bg2)] px-3 py-2 text-[0.82rem] shadow-lg"
            style={{
              left: `clamp(0px, calc(${(cx(hover) / W) * 100}% ${cx(hover) > W * 0.6 ? "- 202px" : "+ 14px"}), calc(100% - 200px))`,
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
                  <i
                    className={`inline-block h-2 w-2 ${dot ? "rounded-full" : ""}`}
                    style={{
                      background: dot ? dotColor(cur.v2) : "#e07b39",
                      clipPath: dot ? undefined : "polygon(50% 0, 100% 100%, 0 100%)",
                    }}
                  />
                  {label2}
                </span>
                <b style={dot ? { color: dotColor(cur.v2) } : undefined}>{f2(cur.v2)}</b>
              </p>
            )}
          </div>
        )}
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[0.8rem] text-[var(--ab-muted)]">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: signColor ? "var(--heat-up)" : "var(--ab-accent)" }} />
          {label1}
          {ax2 ? " (trục phải)" : ""}
        </span>
        {label2 && (
          <span className="flex items-center gap-1.5">
            {dot ? (
              <>
                <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--heat-up)" }} />
                <i className="-ml-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--heat-down)" }} />
              </>
            ) : (
              <i className="inline-block h-2.5 w-2.5" style={{ background: "#e07b39", clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
            )}
            {label2}
            {ax2 ? " (trục trái)" : ""}
          </span>
        )}
      </div>
    </section>
  );
}
