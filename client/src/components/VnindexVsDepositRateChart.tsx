import { Activity } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePolling } from "../hooks/usePolling";
import { fetchVnindexVsVcbRate, type VnindexVcbRatePoint } from "../api/client";

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return `Th${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// One tick per calendar month (first point of each new month) instead of
// Recharts' own pixel-spaced auto ticks — see MarketRegimeChart.tsx for
// why: auto ticks can place several ticks inside the same label period.
function monthTicks(points: VnindexVcbRatePoint[]): string[] {
  const out: string[] = [];
  let lastMonth = "";
  for (const p of points) {
    const month = p.date.slice(0, 7);
    if (month !== lastMonth) {
      out.push(p.date);
      lastMonth = month;
    }
  }
  return out;
}

function VnindexTooltip({ active, payload }: { active?: boolean; payload?: { payload: VnindexVcbRatePoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(d.date)}</div>
      <div className="text-slate-600 dark:text-slate-300">VNINDEX: {d.vnindex.toFixed(1)}</div>
      <div className="text-slate-600 dark:text-slate-300">VCB 6 tháng: {d.vcb6mRate.toFixed(2)}%</div>
    </div>
  );
}

// "Tương quan VNINDEX và lãi suất huy động" — 2 panel xếp chồng, CÙNG một
// trục X (theo tuần), KHÔNG dùng trục Y kép (2 đại lượng khác thang đo —
// điểm số vs %/năm — ghép chung 1 trục Y dễ gây hiểu sai tỷ lệ tương quan).
// Dữ liệu tĩnh, lấy từ SSI MCP — xem data/vnindexVsVcbRate.ts phía server.
export default function VnindexVsDepositRateChart() {
  const { data } = usePolling(() => fetchVnindexVsVcbRate(), [], 30 * 60 * 1000);

  if (!data || data.points.length === 0) return null;

  const points = data.points;
  const ticks = monthTicks(points);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Activity className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
        Tương quan VNINDEX và lãi suất huy động
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        VNINDEX (điểm) và lãi suất tiền gửi kỳ hạn 6 tháng của Vietcombank (%/năm, tham chiếu) theo tuần — 2 biểu đồ
        dùng chung trục thời gian để đối chiếu, không ghép chung 1 trục vì khác thang đo.
      </p>

      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" ticks={ticks} tickFormatter={formatMonth} tick={{ fontSize: 10, fill: "currentColor" }} className="text-slate-500 dark:text-slate-400" />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              width={44}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<VnindexTooltip />} />
            <Line type="monotone" dataKey="vnindex" name="VNINDEX" stroke="#1e293b" strokeWidth={1.75} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" ticks={ticks} tickFormatter={formatMonth} tick={{ fontSize: 10, fill: "currentColor" }} className="text-slate-500 dark:text-slate-400" />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              width={44}
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<VnindexTooltip />} />
            <Line type="stepAfter" dataKey="vcb6mRate" name="VCB 6 tháng" stroke="#6b9080" strokeWidth={1.75} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">VCB 6 tháng (%/năm)</p>

      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        Nguồn: SSI (VNINDEX, lãi suất VCB) — snapshot tĩnh, không tự cập nhật. Không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
