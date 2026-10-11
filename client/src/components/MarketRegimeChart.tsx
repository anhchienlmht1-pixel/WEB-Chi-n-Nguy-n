import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { History } from "lucide-react";
import { usePolling } from "../hooks/usePolling";
import { fetchHistory } from "../api/client";
import { aggregatePoints } from "../utils/aggregate";
import {
  collapseRegimeBands,
  computeMarketRegimeSeries,
  findPositiveTransitions,
  type MarketRegime,
} from "../utils/marketRegime";

const REGIME_COLOR: Record<MarketRegime, string> = {
  positive: "#16a34a",
  watch: "#f59e0b",
  caution: "#dc2626",
};
const REGIME_FILL_OPACITY: Record<MarketRegime, number> = {
  positive: 0.08,
  watch: 0.05,
  caution: 0.08,
};
const REGIME_LABEL: Record<MarketRegime, string> = {
  positive: "Tích cực",
  watch: "Quan sát",
  caution: "Thận trọng",
};

// Chỉ hiển thị 8 năm gần nhất — chỉ báo (SMA50/ADX/Supertrend) vẫn được
// tính trên toàn bộ lịch sử trước khi cắt, để không bị lệch ở đầu đoạn
// hiển thị do thiếu dữ liệu làm nóng.
const DISPLAY_YEARS = 8;
// Khối lượng khớp lệnh theo tuần so với trung bình 52 tuần (~1 năm) gần
// nhất — cùng khung tuần với chính biểu đồ này, khác với gauge "Dòng
// tiền" ở banner (dùng dữ liệu NGÀY, trả lời câu hỏi "hôm nay" tức thời).
const VOLUME_WINDOW_WEEKS = 52;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Recharts' own tick spacing (minTickGap) places ticks every N pixels
// along the axis, independent of what the formatter prints — with weekly
// data and a formatter that collapses each tick down to just the year,
// that produces several adjacent ticks all showing the same year. Passing
// an explicit `ticks` list (one tick per calendar year, at that year's
// first bar) sidesteps the auto-placement entirely so each year shows once.
function yearTicks(rows: { time: string }[]): string[] {
  const out: string[] = [];
  let lastYear = "";
  for (const row of rows) {
    const year = row.time.slice(0, 4);
    if (year !== lastYear) {
      out.push(row.time);
      lastYear = year;
    }
  }
  return out;
}

function PriceTooltip({ active, payload }: { active?: boolean; payload?: { payload: { time: string; close: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(d.time)}</div>
      <div className="text-slate-600 dark:text-slate-300">VNINDEX: {d.close.toFixed(1)}</div>
    </div>
  );
}

function VolumeTooltip({ active, payload }: { active?: boolean; payload?: { payload: { time: string; ratioPct: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{formatDate(d.time)}</div>
      <div className="text-slate-600 dark:text-slate-300">{d.ratioPct.toFixed(0)}% mức bình thường</div>
    </div>
  );
}

// "Trạng thái thị trường qua các năm" — VNINDEX theo TUẦN (không phải
// ngày — xem utils/marketRegime.ts: chạy combo SMA20/50+ADX+Supertrend
// trên nến ngày đổi trạng thái liên tục theo từng dao động nhỏ, không
// phản ánh đúng khái niệm "trạng thái thị trường" kéo dài hàng tháng),
// shaded by the same regime classification as MarketOverviewBanner, with
// the % gain reached after each fresh move into "Tích cực" labeled
// directly on the chart. The panel below plots the same weekly volume
// against its trailing 52-week average.
export default function MarketRegimeChart() {
  const { data } = usePolling(() => fetchHistory("VNINDEX", "MAX"), [], 5 * 60 * 1000);

  const { series, bands, transitions, volumeRows } = useMemo(() => {
    if (!data) return { series: [], bands: [], transitions: [], volumeRows: [] };
    const weekly = aggregatePoints(data.points, "W");
    const fullRegimeSeries = computeMarketRegimeSeries(weekly);
    if (fullRegimeSeries.length === 0) return { series: [], bands: [], transitions: [], volumeRows: [] };

    const weeklyVolumeByTime = new Map(weekly.map((w) => [w.time, w.volume]));
    const fullVolumeRows = fullRegimeSeries.map((bar, i) => {
      const windowStart = Math.max(0, i - (VOLUME_WINDOW_WEEKS - 1));
      const windowBars = fullRegimeSeries.slice(windowStart, i + 1);
      const avgVol =
        windowBars.reduce((sum, b) => sum + (weeklyVolumeByTime.get(b.time) ?? 0), 0) / windowBars.length;
      const vol = weeklyVolumeByTime.get(bar.time) ?? 0;
      return { time: bar.time, ratioPct: avgVol > 0 ? (vol / avgVol) * 100 : 0 };
    });

    const lastTime = new Date(fullRegimeSeries[fullRegimeSeries.length - 1].time).getTime();
    const cutoff = lastTime - DISPLAY_YEARS * 365 * 86_400_000;
    const regimeSeries = fullRegimeSeries.filter((bar) => new Date(bar.time).getTime() >= cutoff);
    const volumeRows = fullVolumeRows.filter((row) => new Date(row.time).getTime() >= cutoff);

    const regimeBands = collapseRegimeBands(regimeSeries);
    const positiveTransitions = findPositiveTransitions(regimeSeries, regimeBands);

    return { series: regimeSeries, bands: regimeBands, transitions: positiveTransitions, volumeRows };
  }, [data]);

  if (series.length === 0) return null;

  const xTicks = yearTicks(series);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <History className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Trạng thái thị trường qua các năm
        </h3>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        VNINDEX theo tuần, {DISPLAY_YEARS} năm gần nhất. Nền màu là trạng thái thị trường; số % là mức tăng tới
        đỉnh đạt được sau mỗi lần chuyển sang Tích cực.
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        {(["positive", "watch", "caution"] as MarketRegime[]).map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: REGIME_COLOR[r] }} />
            {REGIME_LABEL[r]}
          </span>
        ))}
      </div>

      <div className="mt-3 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="time"
              ticks={xTicks}
              tickFormatter={(t: string) => new Date(t).getFullYear().toString()}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
            />
            <YAxis tick={{ fontSize: 10, fill: "currentColor" }} className="text-slate-500 dark:text-slate-400" width={48} domain={["auto", "auto"]} />
            <Tooltip content={<PriceTooltip />} />
            {bands.map((b, i) => (
              <ReferenceArea
                key={i}
                x1={series[b.startIndex].time}
                x2={series[b.endIndex].time}
                fill={REGIME_COLOR[b.regime]}
                fillOpacity={REGIME_FILL_OPACITY[b.regime]}
                stroke="none"
              />
            ))}
            <Line type="monotone" dataKey="close" stroke="#1e293b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            {transitions.map((t, i) => (
              <ReferenceDot
                key={i}
                x={t.time}
                y={t.price}
                r={3}
                fill={REGIME_COLOR.positive}
                stroke="none"
                label={{
                  value: `+${t.peakGainPct.toFixed(0)}%`,
                  position: "top",
                  fontSize: 10,
                  fill: REGIME_COLOR.positive,
                  fontWeight: 600,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h4 className="mt-5 text-xs font-semibold text-slate-700 dark:text-slate-300">
        Khối lượng khớp lệnh theo tuần so với mức bình thường của {VOLUME_WINDOW_WEEKS} tuần
      </h4>
      <div className="mt-2 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={volumeRows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="time"
              ticks={xTicks}
              tickFormatter={(t: string) => new Date(t).getFullYear().toString()}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
            />
            <YAxis tick={{ fontSize: 10, fill: "currentColor" }} className="text-slate-500 dark:text-slate-400" width={40} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine y={120} stroke="#16a34a" strokeDasharray="4 4" strokeOpacity={0.6} />
            <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip content={<VolumeTooltip />} />
            <Line type="monotone" dataKey="ratioPct" stroke="#3b82f6" strokeWidth={1.25} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        120%: tiền vào mạnh hơn bình thường · 80%: tiền rút so với bình thường. Tất cả số liệu tính từ khối lượng
        khớp lệnh thật của VNINDEX — không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
