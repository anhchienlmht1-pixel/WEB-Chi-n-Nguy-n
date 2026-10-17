import { useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePolling } from "../hooks/usePolling";
import { fetchBankDepositRates, type BankDepositRateRow } from "../api/client";

const TERM_KEYS = ["1", "3", "6", "9", "12", "13", "18", "24", "36"] as const;
type TermKey = (typeof TERM_KEYS)[number];
type SelectedTerm = TermKey | "avg";

const TERM_OPTIONS: { key: SelectedTerm; label: string }[] = [
  { key: "avg", label: "Bình quân" },
  ...TERM_KEYS.map((k) => ({ key: k, label: `${k} tháng` })),
];

const BAR_COLOR = "#6b9080";

function average(row: BankDepositRateRow): number | null {
  const values = TERM_KEYS.map((k) => row.terms[k]).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function valueFor(row: BankDepositRateRow, term: SelectedTerm): number | null {
  return term === "avg" ? average(row) : row.terms[term];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { bank: string; value: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{d.bank}</div>
      <div className="text-slate-600 dark:text-slate-300">{d.value.toFixed(2)}%/năm</div>
    </div>
  );
}

// "Lãi suất huy động trung bình" — snapshot tĩnh lấy từ SSI (không có
// lãi suất cho vay: SSI không có nguồn nào cho mục này, chỉ có lãi suất
// tiền gửi theo kỳ hạn của từng ngân hàng). Xem data/bankDepositRates.ts
// phía server — bảng/biểu đồ này không tự cập nhật theo thời gian thực.
export default function BankDepositRateChart() {
  const { data } = usePolling(() => fetchBankDepositRates(), [], 30 * 60 * 1000);
  const [term, setTerm] = useState<SelectedTerm>("avg");

  const rows = useMemo(() => {
    if (!data) return [];
    return data.banks
      .map((row) => ({ row, avg: average(row), value: valueFor(row, term) }))
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  }, [data, term]);

  if (!data || data.banks.length === 0) return null;

  const chartRows = rows
    .filter((r) => r.value !== null)
    .map((r) => ({ bank: r.row.bank, value: r.value as number }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Landmark className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Lãi suất huy động trung bình
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">Cập nhật: {formatDate(data.asOf)}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Lãi suất tiền gửi (%/năm) theo kỳ hạn của 11 ngân hàng, nguồn SSI — snapshot tĩnh, không gồm lãi suất cho vay
        (không có nguồn dữ liệu cho mục này).
      </p>

      {/* Term selector */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TERM_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setTerm(opt.key)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              term === opt.key
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Comparison chart for the selected term */}
      <div className="mt-3" style={{ height: Math.max(220, chartRows.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 8 }}>
            <CartesianGrid horizontal={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
            <XAxis
              type="number"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
            />
            <YAxis
              type="category"
              dataKey="bank"
              width={84}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-slate-600 dark:text-slate-300"
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", className: "text-slate-100 dark:text-slate-800", opacity: 0.4 }} />
            <Bar
              dataKey="value"
              fill={BAR_COLOR}
              radius={[0, 4, 4, 0]}
              label={{ position: "right", formatter: (v: unknown) => `${Number(v).toFixed(2)}%`, fontSize: 11, fill: "currentColor" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {chartRows.length < rows.length && (
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          {rows.length - chartRows.length} ngân hàng không có sản phẩm kỳ hạn này, đã ẩn khỏi biểu đồ.
        </p>
      )}

      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        "Bình quân" tính trên các kỳ hạn có sản phẩm thực tế (loại bỏ kỳ hạn ngân hàng không công bố). Không gồm tiền
        gửi không kỳ hạn. Không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
