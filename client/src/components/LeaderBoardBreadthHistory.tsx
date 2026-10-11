import { Activity } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePolling } from "../hooks/usePolling";
import { fetchStockStrengthHistory, type StockStrengthSnapshot } from "../api/client";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function BreadthTooltip({ active, payload }: { active?: boolean; payload?: { payload: StockStrengthSnapshot }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(d.date)}</div>
      <div className="text-slate-600 dark:text-slate-300">
        {d.breadthPct.toFixed(0)}% dẫn dắt ({d.leadingCount}/{d.totalCount} mã)
      </div>
    </div>
  );
}

// "Độ rộng dẫn dắt" — % mã trên Leader Board đạt band Khỏe/Rất Khỏe
// (điểm SM >= 550, xem providers/stockStrengthHistory.ts), lưu lại mỗi
// ngày từ khi chỉ báo này được thêm vào (trang tính gốc chỉ có dữ liệu
// HÔM NAY, không có lịch sử — nên không thể lùi lại các năm trước, chỉ có
// thể bắt đầu tích lũy từ đây). Chưa dùng để đổi cách phân loại
// Tích cực/Thận trọng của VNINDEX ở banner phía trên — chỉ hiển thị riêng
// cho tới khi có đủ dữ liệu để đối chiếu.
export default function LeaderBoardBreadthHistory() {
  const { data } = usePolling(() => fetchStockStrengthHistory(), [], 5 * 60 * 1000);

  if (!data || !data.enabled || data.items.length === 0) return null;

  const items = data.items;
  const latest = items[items.length - 1];

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Activity className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Độ rộng dẫn dắt theo ngày
        </h3>
        <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
          Hôm nay: {latest.breadthPct.toFixed(0)}% ({latest.leadingCount}/{latest.totalCount} mã)
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        % mã trên Leader Board đạt band Khỏe/Rất Khỏe mỗi ngày. Bắt đầu lưu từ{" "}
        {formatDate(items[0].date)} — chưa có lịch sử trước đó vì trang tính gốc chỉ lưu dữ liệu hiện tại.
      </p>
      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={items} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(t: string) => formatDate(t)}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              width={36}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<BreadthTooltip />} />
            <Line type="monotone" dataKey="breadthPct" stroke="#6b9080" strokeWidth={1.75} dot={items.length <= 14} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
