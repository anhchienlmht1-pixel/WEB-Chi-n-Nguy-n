import { Landmark } from "lucide-react";
import { Line, LineChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePolling } from "../hooks/usePolling";
import { fetchInterestRateHistory, type InterestRatePoint } from "../api/client";

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function RateTooltip({ active, payload }: { active?: boolean; payload?: { payload: InterestRatePoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="max-w-[260px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{formatMonth(d.date)}</div>
      {d.depositRatePct !== null && <div className="text-blue-600 dark:text-blue-400">Tiền gửi: {d.depositRatePct.toFixed(2)}%</div>}
      {d.lendingRatePct !== null && <div className="text-emerald-700 dark:text-emerald-400">Cho vay: {d.lendingRatePct.toFixed(2)}%</div>}
      <div className="mt-1 text-slate-400 dark:text-slate-500">{d.source}</div>
    </div>
  );
}

// "Lãi suất tiết kiệm và cho vay" — NHNN chỉ công bố số này qua báo cáo
// PDF/Word hàng tháng (không có API), nên đây KHÔNG phải một chuỗi tháng
// liên tục mà là vài điểm đã xác minh được, mỗi điểm kèm nguồn/ngày cụ
// thể — xem data/interestRateHistory.ts. Khoảng trống lớn giữa các điểm
// là có thật (chưa xác minh được số liệu các tháng ở giữa), không phải
// lỗi — đường nối chỉ để thấy xu hướng chung giữa các điểm đã biết.
export default function InterestRateChart() {
  const { data } = usePolling(() => fetchInterestRateHistory(), [], 30 * 60 * 1000);

  if (!data || data.items.length === 0) return null;

  const items = data.items;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Landmark className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
        Lãi suất tiết kiệm và cho vay
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Lãi suất bình quân các giao dịch phát sinh mới, theo số liệu NHNN công bố. Chỉ gồm các mốc đã xác minh được
        (NHNN công bố qua báo cáo định kỳ, không có API) — khoảng trống giữa các điểm là thật, chưa có số liệu, không
        phải nội suy.
      </p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={items} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              ticks={items.map((i) => i.date)}
              tickFormatter={formatMonth}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              width={36}
              tickFormatter={(v) => `${v}%`}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<RateTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              name="Lãi tiết kiệm (phát sinh mới)"
              type="monotone"
              dataKey="depositRatePct"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <Line
              name="Lãi cho vay (phát sinh mới)"
              type="monotone"
              dataKey="lendingRatePct"
              stroke="#577368"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        Nguồn: Ngân hàng Nhà nước Việt Nam (NHNN) — không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
