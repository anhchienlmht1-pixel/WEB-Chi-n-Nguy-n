import { useMemo, useState } from "react";
import { Area, Bar, ComposedChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistoryPoint } from "../types";
import type { TradingSignal } from "../utils/signals";

// Biểu đồ tổng quan giá (đường + vùng) kèm khối lượng, và hàng nút khung thời
// gian 1D … ALL. Mỗi nút hiện % thay đổi giá của khung đó, tính từ chính dữ
// liệu giá đóng cửa (1D so với giá tham chiếu). Bấm nút để thu biểu đồ về khung.

type Key = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "ALL";
const KEYS: Key[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "ALL"];

const GOLD = "#d9b155";
const AXIS = "#8f9a84";
const VOL = "rgba(203,191,159,0.28)";

const dayMs = 86_400_000;

function startIndex(points: HistoryPoint[], k: Key): number {
  const n = points.length;
  if (n === 0) return 0;
  if (k === "ALL") return 0;
  if (k === "1D") return Math.max(0, n - 2);
  if (k === "5D") return Math.max(0, n - 6);
  const last = new Date(points[n - 1].time).getTime();
  let from: number;
  if (k === "YTD") from = Date.UTC(new Date(last).getUTCFullYear(), 0, 1) - 1;
  else from = last - { "1M": 30, "6M": 182, "1Y": 365, "5Y": 1826 }[k] * dayMs;
  // Giá đóng cửa cuối cùng TRƯỚC mốc: điểm gốc để tính % thay đổi.
  let i = 0;
  while (i < n - 1 && new Date(points[i + 1].time).getTime() <= from) i++;
  return i;
}

const pctText = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

// Ngày (YYYY-MM-DD, giờ VN) của một tín hiệu tính theo giây UTC.
const sigDay = (sec: number) => new Date(sec * 1000 + 7 * 3600_000).toISOString().slice(0, 10);

export default function PriceOverviewChart({
  symbol,
  history,
  loading,
  signals = [],
  prevClose,
  price,
  fmt,
}: {
  symbol: string;
  history: HistoryPoint[];
  loading: boolean;
  /** Điểm Mua/Đóng lệnh của hệ thống (tính sau phiên), vẽ thành tam giác. */
  signals?: TradingSignal[];
  prevClose?: number;
  price?: number;
  fmt: (n: number) => string;
}) {
  const [k, setK] = useState<Key>("1Y");
  const points = useMemo(() => history.filter((p) => Number.isFinite(p.close) && p.close > 0), [history]);

  // Giá đóng cửa trong lịch sử có thể khác đơn vị giá khớp (nghìn đồng vs đồng):
  // quy về cùng đơn vị với giá hiện tại để trục và tooltip khớp con số ở trên.
  const scale = useMemo(() => {
    const lastClose = points[points.length - 1]?.close;
    if (!lastClose || !price) return 1;
    const r = price / lastClose;
    return r > 500 ? 1000 : r < 0.002 ? 0.001 : 1;
  }, [points, price]);

  const returns = useMemo(() => {
    const out = {} as Record<Key, number | null>;
    const n = points.length;
    for (const key of KEYS) {
      if (n < 2) {
        out[key] = null;
        continue;
      }
      const lastClose = (price ?? points[n - 1].close * scale) / scale;
      const base = key === "1D" && prevClose ? prevClose / scale : points[startIndex(points, key)].close;
      out[key] = base > 0 ? (lastClose / base - 1) * 100 : null;
    }
    return out;
  }, [points, price, prevClose, scale]);

  const view = useMemo(() => {
    const from = k === "1D" ? Math.max(0, points.length - 5) : startIndex(points, k);
    return points.slice(from).map((p) => ({ t: p.time.slice(0, 10), c: p.close * scale, v: p.volume }));
  }, [points, k, scale]);

  // Chỉ vẽ điểm mua đầu tiên (Mua 1/3) và điểm đóng lệnh để biểu đồ gọn.
  const marks = useMemo(() => {
    const byDay = new Map(view.map((d) => [d.t, d.c]));
    return signals
      .filter((sg) => sg.type === "sell" || sg.note?.startsWith("Mua 1/"))
      .map((sg) => ({ t: sigDay(sg.time), buy: sg.type === "buy", note: sg.note ?? "" }))
      .filter((m) => byDay.has(m.t))
      .map((m) => ({ ...m, c: byDay.get(m.t)! }));
  }, [signals, view]);

  const years = view.length > 0 ? (new Date(view[view.length - 1].t).getTime() - new Date(view[0].t).getTime()) / (365 * dayMs) : 0;
  const tickFmt = (t: string) => {
    const [y, m, d] = t.split("-");
    return years > 2 ? y : years > 0.4 ? `${m}/${y.slice(2)}` : `${d}/${m}`;
  };
  const up = (returns[k] ?? 0) >= 0;
  const line = up ? GOLD : "#ff8a7a";

  return (
    <div className="flex h-full flex-col rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-4">
      <div className="relative h-[300px] lg:h-auto lg:min-h-[300px] lg:flex-1">
        {loading && points.length === 0 ? (
          <div className="h-full animate-pulse rounded bg-[var(--ab-skel)]" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={view} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`pov-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={line} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                tickFormatter={tickFmt}
                tick={{ fontSize: 11, fill: AXIS }}
                tickLine={false}
                axisLine={{ stroke: "rgba(239,231,212,0.08)" }}
                minTickGap={40}
              />
              <YAxis
                yAxisId="p"
                orientation="right"
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: AXIS }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v) => fmt(v)}
              />
              <YAxis yAxisId="v" hide domain={[0, (max: number) => max * 4]} />
              <Tooltip
                cursor={{ stroke: "rgba(201,162,74,0.45)", strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { t: string; c: number; v: number };
                  const [y, m, dd] = d.t.split("-");
                  return (
                    <div className="rounded-md border border-[rgba(201,162,74,0.45)] bg-[#1a2418] px-3 py-2 text-[0.8rem] shadow-lg">
                      <div className="font-semibold text-[var(--sm-egg)]">{symbol} · {dd}/{m}/{y}</div>
                      <div className="mt-1 flex justify-between gap-4 tabular-nums">
                        <span className="text-[var(--sm-mut)]">Giá đóng cửa</span>
                        <b className="text-[var(--sm-egg)]">{fmt(d.c)}</b>
                      </div>
                      <div className="flex justify-between gap-4 tabular-nums">
                        <span className="text-[var(--sm-mut)]">Khối lượng</span>
                        <b className="text-[var(--sm-egg)]">{Math.round(d.v).toLocaleString("vi-VN")}</b>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar yAxisId="v" dataKey="v" fill={VOL} isAnimationActive={false} />
              <Area
                yAxisId="p"
                type="monotone"
                dataKey="c"
                stroke={line}
                strokeWidth={1.75}
                fill={`url(#pov-${symbol})`}
                dot={false}
                activeDot={{ r: 4, fill: line, stroke: "#121a11", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {marks.map((m) => (
                <ReferenceDot
                  key={m.t + m.note}
                  yAxisId="p"
                  x={m.t}
                  y={m.c}
                  r={6}
                  ifOverflow="extendDomain"
                  shape={(props: { cx?: number; cy?: number }) => {
                    const cx = props.cx ?? 0;
                    const cy = props.cy ?? 0;
                    return m.buy ? (
                      <path d={`M${cx},${cy + 7} l6,10 h-12 z`} fill="#4fd18b" stroke="#121a11" strokeWidth={1.5}>
                        <title>{`${m.note} · ${m.t.split("-").reverse().join("/")}`}</title>
                      </path>
                    ) : (
                      <path d={`M${cx},${cy - 7} l6,-10 h-12 z`} fill="#ff6b5e" stroke="#121a11" strokeWidth={1.5}>
                        <title>{`${m.note} · ${m.t.split("-").reverse().join("/")}`}</title>
                      </path>
                    );
                  }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div role="group" aria-label="Khung thời gian" className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-8">
        {KEYS.map((key) => {
          const r = returns[key];
          const on = key === k;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => setK(key)}
              className={`flex min-h-12 flex-col items-center justify-center rounded-[3px] px-1 py-1.5 transition-colors ${
                on ? "bg-[rgba(201,162,74,0.14)] ring-1 ring-[rgba(201,162,74,0.55)]" : "hover:bg-[rgba(239,231,212,0.05)]"
              }`}
            >
              <span className={`text-[0.85rem] font-semibold ${on ? "text-[var(--sm-gold2)]" : "text-[var(--sm-egg2)]"}`}>{key}</span>
              <span className={`text-[0.8rem] tabular-nums ${r == null ? "text-[var(--sm-mut)]" : r > 0 ? "up" : r < 0 ? "down" : "text-[var(--sm-mut)]"}`}>
                {r == null ? "—" : pctText(r)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
