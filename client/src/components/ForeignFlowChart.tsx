import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { ForeignFlowRow } from "../utils/foreignFlow";
import { formatNetValue } from "../utils/foreignFlow";

const TOP_N = 15;
const UP_COLOR = "#16a34a"; // green — mua ròng
const DOWN_COLOR = "#dc2626"; // red — bán ròng

interface ChartDatum {
  symbol: string;
  netValueBillion: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{d.symbol}</div>
      <div className={d.netValueBillion >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
        {formatNetValue(d.netValueBillion * 1_000_000_000)}
      </div>
    </div>
  );
}

// Diverging bar chart: mua ròng (net buy) renders as a green bar rising
// above the zero line, bán ròng (net sell) as a red bar dropping below it —
// symbols sorted by net value so the chart reads left-to-right from
// strongest buy to strongest sell.
export default function ForeignFlowChart({ rows }: { rows: ForeignFlowRow[] }) {
  const data = useMemo<ChartDatum[]>(() => {
    const sorted = [...rows].sort((a, b) => b.netValue - a.netValue);
    const top = sorted.filter((r) => r.netValue > 0).slice(0, TOP_N);
    const bottom = sorted
      .filter((r) => r.netValue < 0)
      .slice(-TOP_N)
      .reverse();
    return [...top, ...bottom].map((r) => ({
      symbol: r.quote.symbol,
      netValueBillion: r.netValue / 1_000_000_000,
    }));
  }, [rows]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Top mua ròng / bán ròng khối ngoại (giá trị ước tính, tỷ VND)
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: UP_COLOR }} /> Mua ròng
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: DOWN_COLOR }} /> Bán ròng
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <XAxis
            dataKey="symbol"
            tick={{ fontSize: 10, fill: "currentColor" }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
            className="text-slate-500 dark:text-slate-400"
          />
          <YAxis tick={{ fontSize: 10, fill: "currentColor" }} className="text-slate-500 dark:text-slate-400" width={48} />
          <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", opacity: 0.05 }} />
          <Bar dataKey="netValueBillion" radius={[3, 3, 3, 3]}>
            {data.map((d) => (
              <Cell key={d.symbol} fill={d.netValueBillion >= 0 ? UP_COLOR : DOWN_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        GT ròng = KL mua ròng × giá hiện tại (ước tính, KBS không cung cấp giá trị khớp lệnh thực của khối ngoại).
      </p>
    </div>
  );
}
