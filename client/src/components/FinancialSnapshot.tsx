import { useMemo } from "react";
import {
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

const REVENUE_COLOR = "#93c5fd";
const PROFIT_COLOR = "#00c694";
const PE_COLOR = "#3b82f6";
const PB_COLOR = "#00c694";
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
  return { fontSize: 10, fill: "currentColor" } as const;
}

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
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
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
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
        {latestLabel && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {latestLabel} <span className="font-semibold text-slate-600 dark:text-slate-300">{latestBadge}</span>
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-500 dark:text-slate-400">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <div className="mt-2 h-40">{children}</div>
      {caption && <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{caption}</p>}
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
  if (cur > prev) return { label: "Tăng tốc ▲", className: "text-green-600 dark:text-green-400" };
  if (cur < prev) return { label: "Giảm tốc ▼", className: "text-red-600 dark:text-red-400" };
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
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="h-6 w-64 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !hasData) return null;

  const rows = data;
  const latest = last(rows)!;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <LineChartIcon className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Tài chính — {WINDOW} quý gần nhất
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {latest.pe != null && <>P/E hiện tại: {fmtRatio(latest.pe)}</>}
          {latest.pb != null && <> · P/B hiện tại: {fmtRatio(latest.pb)}</>}
          {latest.roe != null && <> · ROE hiện tại: {fmtRatio(latest.roe)}%</>}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard
          title="Tăng trưởng YoY — Doanh thu & Lợi nhuận"
          legend={[
            { label: "%YoY Doanh thu", color: REVENUE_COLOR },
            { label: "%YoY Lợi nhuận", color: PROFIT_COLOR },
          ]}
          caption={growthCaption(rows)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
              <XAxis dataKey="label" tick={axisTick()} className="text-slate-500 dark:text-slate-400" hide />
              <YAxis tick={axisTick()} className="text-slate-500 dark:text-slate-400" width={40} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
              <Tooltip content={<ChartTooltip fmt={(v) => `${v.toFixed(1)}%`} />} />
              <Line type="monotone" dataKey="yoyRevenuePct" name="%YoY Doanh thu" stroke={REVENUE_COLOR} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="yoyProfitPct" name="%YoY Lợi nhuận" stroke={PROFIT_COLOR} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Quy mô — Doanh thu & LNST (tỷ đồng)"
          legend={[
            { label: "Doanh thu", color: REVENUE_COLOR },
            { label: "LNST", color: PROFIT_COLOR },
          ]}
          caption={scaleCaption(rows)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <XAxis dataKey="label" tick={axisTick()} className="text-slate-500 dark:text-slate-400" hide />
              <YAxis tick={axisTick()} className="text-slate-500 dark:text-slate-400" width={40} />
              <Tooltip content={<ChartTooltip fmt={(v) => `${fmtBn(v)} tỷ`} />} />
              <Bar dataKey="revenueBn" name="Doanh thu" fill={REVENUE_COLOR} radius={[2, 2, 0, 0]} />
              <Bar dataKey="netProfitBn" name="LNST" fill={PROFIT_COLOR} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ROE theo quý (%)" legend={[{ label: "ROE", color: PROFIT_COLOR }]} caption={roeCaption(rows)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
              <XAxis dataKey="label" tick={axisTick()} className="text-slate-500 dark:text-slate-400" hide />
              <YAxis tick={axisTick()} className="text-slate-500 dark:text-slate-400" width={40} tickFormatter={(v) => `${v}%`} />
              {average(rows.map((r) => r.roe)) != null && (
                <ReferenceLine y={average(rows.map((r) => r.roe))!} stroke={PROFIT_COLOR} strokeDasharray="4 4" strokeOpacity={0.5} />
              )}
              <Tooltip content={<ChartTooltip fmt={(v) => `${v.toFixed(1)}%`} />} />
              <Line type="monotone" dataKey="roe" name="ROE" stroke={PROFIT_COLOR} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Định giá — P/E & P/B (lần)"
          legend={[
            { label: "P/E", color: PE_COLOR },
            { label: "P/B", color: PB_COLOR },
          ]}
          caption={valuationCaption(rows)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
              <XAxis dataKey="label" tick={axisTick()} className="text-slate-500 dark:text-slate-400" hide />
              <YAxis yAxisId="pe" tick={axisTick()} className="text-slate-500 dark:text-slate-400" width={32} />
              <YAxis yAxisId="pb" orientation="right" tick={axisTick()} className="text-slate-500 dark:text-slate-400" width={32} />
              <Tooltip content={<ChartTooltip fmt={(v) => v.toFixed(2)} />} />
              <Line yAxisId="pe" type="monotone" dataKey="pe" name="P/E" stroke={PE_COLOR} strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="pb" type="monotone" dataKey="pb" name="P/B" stroke={PB_COLOR} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">Quý</th>
              {rows.map((r) => (
                <th key={r.label} className="whitespace-nowrap px-2 py-1.5 text-right font-medium">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-300">
            <tr className="border-b border-slate-100 dark:border-slate-900">
              <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">Doanh thu (tỷ)</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                  {fmtBn(r.revenueBn)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-900">
              <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">LNST (tỷ)</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                  {fmtBn(r.netProfitBn)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-900">
              <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">%YoY DT</td>
              {rows.map((r) => (
                <td
                  key={r.label}
                  className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${
                    r.yoyRevenuePct == null ? "" : r.yoyRevenuePct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {fmtPct(r.yoyRevenuePct)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-900">
              <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">%YoY LN</td>
              {rows.map((r) => (
                <td
                  key={r.label}
                  className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${
                    r.yoyProfitPct == null ? "" : r.yoyProfitPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {fmtPct(r.yoyProfitPct)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-900">
              <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">ROE (%)</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                  {fmtRatio(r.roe)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-900">
              <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">Xu hướng LN</td>
              {rows.map((r, i) => {
                const trend = profitTrend(rows, i);
                return (
                  <td key={r.label} className={`whitespace-nowrap px-2 py-1.5 text-right ${trend?.className ?? "text-slate-400"}`}>
                    {trend?.label ?? "—"}
                  </td>
                );
              })}
            </tr>
            <tr className="border-b border-slate-100 dark:border-slate-900">
              <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">P/E</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                  {fmtRatio(r.pe)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-white py-1.5 pr-3 font-medium dark:bg-slate-900/40">P/B</td>
              {rows.map((r) => (
                <td key={r.label} className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                  {fmtRatio(r.pb)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        Số liệu tổng hợp từ báo cáo tài chính hợp nhất theo quý — %YoY so với cùng kỳ năm trước, đường ngang trên chart
        ROE là mức trung bình {WINDOW} quý. Chỉ mang tính tham khảo, không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
