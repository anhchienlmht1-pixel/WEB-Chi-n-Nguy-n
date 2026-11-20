import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchFinancials } from "../api/client";
import { buildQuarterlySeries, average, last, type QuarterRow } from "../utils/financialSeries";
import { formatPercent } from "../utils/format";

// Bảng màu Sơn mài: vàng son cho chỉ tiêu chính (lợi nhuận, ROE, P/E), vỏ trứng
// cho chỉ tiêu đi kèm (doanh thu, P/B). Lưới chỉ kẻ ngang, rất mờ.
const REVENUE_COLOR = "#cbbf9f";
const PROFIT_COLOR = "#d9b155";
const PE_COLOR = "#d9b155";
const PB_COLOR = "#cbbf9f";
const GRID = "rgba(239,231,212,0.07)";
const AXIS = "#8f9a84";
const WINDOW = 12;

function fmtBn(v: number | null): string {
  return v == null ? "—" : v.toLocaleString("vi-VN", { maximumFractionDigits: v >= 100 ? 0 : 1 });
}

function fmtPct(v: number | null): string {
  return v == null ? "—" : formatPercent(v);
}

function fmtRatio(v: number | null): string {
  return v == null ? "—" : v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function axisTick() {
  return { fontSize: 11, fill: AXIS } as const;
}

// "Q3 2026" hoặc "Q3/2026" -> "Q3/26" cho trục ngang gọn.
const shortQ = (l: string) => String(l).replace(/^(Q\d)[\s/]+20(\d\d)$/, "$1/$2");
const xAxisProps = {
  dataKey: "label",
  tick: axisTick(),
  tickFormatter: shortQ,
  tickLine: false,
  axisLine: { stroke: GRID },
  interval: "preserveStartEnd" as const,
  minTickGap: 18,
};
const yAxisProps = { tick: axisTick(), tickLine: false, axisLine: false };

function ChartTooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  fmt: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[rgba(201,162,74,0.45)] bg-[#1a2418] px-3 py-2 text-[0.8rem] shadow-lg">
      <div className="font-semibold text-[var(--sm-egg)]">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="mt-0.5 flex items-center justify-between gap-4 tabular-nums">
          <span className="flex items-center gap-1.5 text-[var(--sm-mut)]">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <b className="text-[var(--sm-egg)]">{fmt(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  latestLabel,
  latestBadge,
  legend,
  children,
  caption,
}: {
  title: string;
  latestLabel?: string;
  latestBadge?: string;
  legend: { label: string; color: string }[];
  children: React.ReactNode;
  caption: string;
}) {
  return (
    <div className="flex flex-col rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="font-display text-[1.08rem] font-bold text-[var(--sm-egg)]">{title}</h4>
        {latestLabel && (
          <span className="text-[0.78rem] text-[var(--sm-mut)]">
            {latestLabel} <span className="font-semibold text-[var(--sm-egg2)]">{latestBadge}</span>
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[0.78rem] text-[var(--sm-mut)]">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <div className="mt-3 h-52">{children}</div>
      {caption && (
        <p className="mt-3 border-t border-[var(--sm-line2)] pt-3 text-[0.8rem] leading-relaxed text-[var(--sm-egg2)]">{caption}</p>
      )}
    </div>
  );
}

function growthCaption(rows: QuarterRow[]): string {
  const latest = last(rows);
  if (!latest || latest.yoyProfitPct == null) return "";
  const avg = average(rows.map((r) => r.yoyProfitPct));
  const cmp = avg == null ? "" : ` — ${latest.yoyProfitPct > avg ? "cao hơn" : "thấp hơn"} trung bình chuỗi ${WINDOW} quý (${fmtPct(avg)}).`;
  return `${latest.label}: LNST ${fmtPct(latest.yoyProfitPct)} YoY${cmp}`;
}

function scaleCaption(rows: QuarterRow[]): string {
  const latest = last(rows);
  const prev = rows[rows.length - 2];
  if (!latest?.revenueBn) return "";
  let cmp = "";
  if (prev?.revenueBn) {
    const diffPct = ((latest.revenueBn - prev.revenueBn) / prev.revenueBn) * 100;
    cmp = ` — ${diffPct >= 0 ? "cao hơn" : "thấp hơn"} ${prev.label} (${fmtBn(prev.revenueBn)} tỷ) ${Math.abs(diffPct).toFixed(1)}%.`;
  }
  return `${latest.label}: doanh thu ${fmtBn(latest.revenueBn)} tỷ${cmp}`;
}

function roeCaption(rows: QuarterRow[]): string {
  const latest = last(rows);
  if (!latest || latest.roe == null) return "";
  const values = rows.map((r) => r.roe);
  const avg = average(values);
  const max = Math.max(...values.filter((v): v is number => v != null));
  const cmp = avg == null ? "" : ` — ${latest.roe > avg ? "cao hơn" : "thấp hơn"} trung bình chuỗi (${fmtRatio(avg)}%)`;
  const isMax = latest.roe === max ? `, cao nhất trong ${WINDOW} quý.` : ".";
  return `${latest.label}: ROE ${fmtRatio(latest.roe)}%${cmp}${isMax}`;
}

function valuationCaption(rows: QuarterRow[]): string {
  const latest = last(rows);
  if (!latest || latest.pe == null) return "";
  const avg = average(rows.map((r) => r.pe));
  const cmp = avg == null ? "" : ` — nằm ${latest.pe > avg ? "trên" : "dưới"} trung bình chuỗi (${fmtRatio(avg)} lần)`;
  const pb = latest.pb == null ? "" : `, P/B ${fmtRatio(latest.pb)} lần`;
  return `${latest.label}: P/E ${fmtRatio(latest.pe)} lần${cmp}${pb}.`;
}

// Profit-growth acceleration: compares THIS quarter's YoY LNST growth to
// the PREVIOUS quarter's, not the raw profit figure — "Tăng tốc" means the
// growth rate itself is speeding up, "Giảm tốc" that it's slowing (even if
// profit is still growing).
function profitTrend(rows: QuarterRow[], i: number): { label: string; className: string } | null {
  if (i === 0) return null;
  const cur = rows[i].yoyProfitPct;
  const prev = rows[i - 1].yoyProfitPct;
  if (cur == null || prev == null) return null;
  if (cur > prev) return { label: "Tăng tốc ▲", className: "up" };
  if (cur < prev) return { label: "Giảm tốc ▼", className: "down" };
  return { label: "Đi ngang", className: "text-slate-500 dark:text-slate-400" };
}

// Auto-generated financial snapshot from the last 12 quarters of the
// company's own reported KQKD (revenue/profit) and CSTC (ROE/P/E/P/B)
// figures (see utils/financialSeries.ts) — every number and caption is
// computed straight from those reports, nothing here is a forecast or a
// recommendation.
export default function FinancialSnapshot({ symbol }: { symbol: string }) {
  const { data, loading } = usePolling(
    async () => {
      const [kqkd, cstc] = await Promise.all([
        fetchFinancials(symbol, "KQKD", "quarter"),
        fetchFinancials(symbol, "CSTC", "quarter"),
      ]);
      return buildQuarterlySeries(kqkd, cstc, WINDOW);
    },
    [symbol],
    6 * 60 * 60 * 1000
  );

  const hasData = useMemo(
    () => (data ?? []).some((r) => r.revenueBn != null || r.roe != null || r.pe != null),
    [data]
  );

  if (loading && !data) {
    return (
      <div className="mt-2">
        <div className="h-7 w-72 animate-pulse rounded bg-[var(--ab-skel)]" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-md bg-[var(--ab-skel)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !hasData) return null;

  const rows = data;
  const latest = last(rows)!;

  return (
    <section className="mt-2">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgba(201,162,74,0.35)] pb-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-[1.6rem] leading-tight text-[var(--sm-egg)]">
            <LineChartIcon className="h-5 w-5 text-[var(--sm-gold2)]" strokeWidth={1.75} aria-hidden="true" />
            Tài chính {WINDOW} quý gần nhất
          </h3>
          <p className="mt-1 text-[0.85rem] text-[var(--sm-mut)]">Từ báo cáo tài chính hợp nhất theo quý · kỳ mới nhất {latest.label}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["P/E", latest.pe != null ? `${fmtRatio(latest.pe)} lần` : null],
            ["P/B", latest.pb != null ? `${fmtRatio(latest.pb)} lần` : null],
            ["ROE", latest.roe != null ? `${fmtRatio(latest.roe)}%` : null],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <span key={k} className="rounded-[2px] border border-[var(--sm-line)] bg-[var(--sm-panel)] px-3 py-1.5 text-[0.85rem]">
                <span className="text-[var(--sm-mut)]">{k}</span> <b className="tabular-nums text-[var(--sm-egg)]">{v}</b>
              </span>
            ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Tăng trưởng so với cùng kỳ"
          legend={[
            { label: "%YoY Doanh thu", color: REVENUE_COLOR },
            { label: "%YoY Lợi nhuận", color: PROFIT_COLOR },
          ]}
          caption={growthCaption(rows)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} width={44} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={0} stroke="rgba(239,231,212,0.25)" />
              <Tooltip cursor={{ stroke: "rgba(201,162,74,0.35)", fill: "rgba(201,162,74,0.06)" }} content={<ChartTooltip fmt={(v) => `${v.toFixed(1)}%`} />} />
              <Line type="monotone" dataKey="yoyRevenuePct" name="%YoY Doanh thu" stroke={REVENUE_COLOR} strokeWidth={1.75} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="yoyProfitPct" name="%YoY Lợi nhuận" stroke={PROFIT_COLOR} strokeWidth={2.25} dot={{ r: 2.5, fill: PROFIT_COLOR, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Doanh thu và lợi nhuận sau thuế (tỷ đồng)"
          legend={[
            { label: "Doanh thu", color: REVENUE_COLOR },
            { label: "LNST", color: PROFIT_COLOR },
          ]}
          caption={scaleCaption(rows)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} width={52} tickFormatter={(v) => fmtBn(v)} />
              <Tooltip cursor={{ stroke: "rgba(201,162,74,0.35)", fill: "rgba(201,162,74,0.06)" }} content={<ChartTooltip fmt={(v) => `${fmtBn(v)} tỷ`} />} />
              <Bar dataKey="revenueBn" name="Doanh thu" fill={REVENUE_COLOR} fillOpacity={0.45} radius={[3, 3, 0, 0]} />
              <Bar dataKey="netProfitBn" name="LNST" fill={PROFIT_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ROE theo quý (%)" legend={[{ label: "ROE", color: PROFIT_COLOR }]} caption={roeCaption(rows)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`roe-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PROFIT_COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PROFIT_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} width={44} tickFormatter={(v) => `${v}%`} />
              {average(rows.map((r) => r.roe)) != null && (
                <ReferenceLine
                  y={average(rows.map((r) => r.roe))!}
                  stroke="rgba(239,231,212,0.45)"
                  strokeDasharray="4 4"
                  label={{ value: "TB", position: "insideTopLeft", fill: AXIS, fontSize: 10 }}
                />
              )}
              <Tooltip cursor={{ stroke: "rgba(201,162,74,0.35)" }} content={<ChartTooltip fmt={(v) => `${v.toFixed(1)}%`} />} />
              <Area type="monotone" dataKey="roe" name="ROE" stroke={PROFIT_COLOR} strokeWidth={2.25} fill={`url(#roe-${symbol})`} dot={false} activeDot={{ r: 5 }} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Định giá P/E và P/B (lần)"
          legend={[
            { label: "P/E (trục trái)", color: PE_COLOR },
            { label: "P/B (trục phải)", color: PB_COLOR },
          ]}
          caption={valuationCaption(rows)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis {...xAxisProps} />
              <YAxis yAxisId="pe" {...yAxisProps} width={36} />
              <YAxis yAxisId="pb" orientation="right" {...yAxisProps} width={36} />
              <Tooltip cursor={{ stroke: "rgba(201,162,74,0.35)", fill: "rgba(201,162,74,0.06)" }} content={<ChartTooltip fmt={(v) => v.toFixed(2)} />} />
              <Line yAxisId="pe" type="monotone" dataKey="pe" name="P/E (trục trái)" stroke={PE_COLOR} strokeWidth={2.25} dot={false} activeDot={{ r: 5 }} connectNulls />
              <Line yAxisId="pb" type="monotone" dataKey="pb" name="P/B (trục phải)" stroke={PB_COLOR} strokeWidth={1.75} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] p-2">
        <table className="w-full min-w-[720px] border-collapse text-[0.85rem]">
          <thead>
            <tr className="border-b border-[rgba(201,162,74,0.35)] text-left text-[var(--sm-gold2)]">
              <th className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">Quý</th>
              {rows.map((r) => (
                <th key={r.label} className="whitespace-nowrap px-2 py-2 text-right font-semibold">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[var(--sm-egg2)]">
            <tr className="border-b border-[var(--sm-line2)]">
              <td className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">Doanh thu (tỷ)</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {fmtBn(r.revenueBn)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--sm-line2)]">
              <td className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">LNST (tỷ)</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {fmtBn(r.netProfitBn)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--sm-line2)]">
              <td className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">%YoY DT</td>
              {rows.map((r) => (
                <td
                  key={r.label}
                  className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${
                    r.yoyRevenuePct == null ? "" : r.yoyRevenuePct >= 0 ? "up" : "down"
                  }`}
                >
                  {fmtPct(r.yoyRevenuePct)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--sm-line2)]">
              <td className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">%YoY LN</td>
              {rows.map((r) => (
                <td
                  key={r.label}
                  className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${
                    r.yoyProfitPct == null ? "" : r.yoyProfitPct >= 0 ? "up" : "down"
                  }`}
                >
                  {fmtPct(r.yoyProfitPct)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--sm-line2)]">
              <td className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">ROE (%)</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {fmtRatio(r.roe)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[var(--sm-line2)]">
              <td className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">Xu hướng LN</td>
              {rows.map((r, i) => {
                const trend = profitTrend(rows, i);
                return (
                  <td key={r.label} className={`whitespace-nowrap px-2 py-2 text-right ${trend?.className ?? "text-slate-400"}`}>
                    {trend?.label ?? "—"}
                  </td>
                );
              })}
            </tr>
            <tr className="border-b border-[var(--sm-line2)]">
              <td className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">P/E</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {fmtRatio(r.pe)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 whitespace-nowrap bg-[#1a2418] py-2 pr-3 pl-2 font-semibold">P/B</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {fmtRatio(r.pb)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[0.78rem] leading-relaxed text-[var(--sm-mut)]">
        Số liệu tổng hợp từ báo cáo tài chính hợp nhất theo quý — %YoY so với cùng kỳ năm trước, đường ngang trên chart
        ROE là mức trung bình {WINDOW} quý. Chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
      </p>
    </section>
  );
}
