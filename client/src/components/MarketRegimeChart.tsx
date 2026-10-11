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
const VOLUME_UPPER = 120;
const VOLUME_LOWER = 80;
const VOLUME_UPPER_COLOR = "#16a34a";
const VOLUME_LOWER_COLOR = "#dc2626";
const VOLUME_BASE_COLOR = "#94a3b8";

interface VolumeRow {
  time: string;
  ratioPct: number;
  aboveUpper: number | null;
  belowLower: number | null;
}

// Local maxima within each contiguous "tiền vào mạnh" (>= VOLUME_UPPER)
// run — one dot per run, not every point in it, matching how the
// reference chart only marks each spike's own peak.
function findLocalPeaks(rows: VolumeRow[]): VolumeRow[] {
  const peaks: VolumeRow[] = [];
  let runBest: VolumeRow | null = null;
  for (const row of rows) {
    if (row.aboveUpper !== null) {
      if (!runBest || row.ratioPct > runBest.ratioPct) runBest = row;
    } else if (runBest) {
      peaks.push(runBest);
      runBest = null;
    }
  }
  if (runBest) peaks.push(runBest);
  return peaks;
}

// Pill badge pinned to the last point, mirroring the reference chart's
// "63%" callout — Recharts clones this element and injects `viewBox`
// (the dot's own already-computed pixel position) when passed as a
// ReferenceDot's `label`.
function EndValueBadge(props: any) {
  const { viewBox, value, fill } = props;
  if (!viewBox) return null;
  const text = `${Math.round(value)}%`;
  const width = text.length * 7 + 16;
  return (
    <g>
      <rect x={viewBox.x + 8} y={viewBox.y - 10} width={width} height={20} rx={10} fill={fill} />
      <text x={viewBox.x + 8 + width / 2} y={viewBox.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
        {text}
      </text>
    </g>
  );
}

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

  const { series, bands, transitions, volumeRows, volumePeaks } = useMemo(() => {
    if (!data) return { series: [], bands: [], transitions: [], volumeRows: [], volumePeaks: [] };
    const weekly = aggregatePoints(data.points, "W");
    const fullRegimeSeries = computeMarketRegimeSeries(weekly);
    if (fullRegimeSeries.length === 0) return { series: [], bands: [], transitions: [], volumeRows: [], volumePeaks: [] };

    const weeklyVolumeByTime = new Map(weekly.map((w) => [w.time, w.volume]));
    const fullVolumeRows: VolumeRow[] = fullRegimeSeries.map((bar, i) => {
      const windowStart = Math.max(0, i - (VOLUME_WINDOW_WEEKS - 1));
      const windowBars = fullRegimeSeries.slice(windowStart, i + 1);
      const avgVol =
        windowBars.reduce((sum, b) => sum + (weeklyVolumeByTime.get(b.time) ?? 0), 0) / windowBars.length;
      const vol = weeklyVolumeByTime.get(bar.time) ?? 0;
      const ratioPct = avgVol > 0 ? (vol / avgVol) * 100 : 0;
      return {
        time: bar.time,
        ratioPct,
        aboveUpper: ratioPct >= VOLUME_UPPER ? ratioPct : null,
        belowLower: ratioPct <= VOLUME_LOWER ? ratioPct : null,
      };
    });

    const lastTime = new Date(fullRegimeSeries[fullRegimeSeries.length - 1].time).getTime();
    const cutoff = lastTime - DISPLAY_YEARS * 365 * 86_400_000;
    const regimeSeries = fullRegimeSeries.filter((bar) => new Date(bar.time).getTime() >= cutoff);
    const volumeRows = fullVolumeRows.filter((row) => new Date(row.time).getTime() >= cutoff);

    const regimeBands = collapseRegimeBands(regimeSeries);
    const positiveTransitions = findPositiveTransitions(regimeSeries, regimeBands);
    const peaks = findLocalPeaks(volumeRows);

    return { series: regimeSeries, bands: regimeBands, transitions: positiveTransitions, volumeRows, volumePeaks: peaks };
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

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Khối lượng khớp lệnh theo tuần so với mức bình thường của {VOLUME_WINDOW_WEEKS} tuần
        </h4>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-3 border-t-2 border-dashed" style={{ borderColor: VOLUME_UPPER_COLOR }} />
            {VOLUME_UPPER}%: tiền vào mạnh
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-3 border-t-2 border-dashed" style={{ borderColor: VOLUME_LOWER_COLOR }} />
            {VOLUME_LOWER}%: tiền rút
          </span>
        </div>
      </div>
      <div className="mt-2 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={volumeRows} margin={{ top: 4, right: 36, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="time"
              ticks={xTicks}
              tickFormatter={(t: string) => new Date(t).getFullYear().toString()}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
            />
            <YAxis tick={{ fontSize: 10, fill: "currentColor" }} className="text-slate-500 dark:text-slate-400" width={40} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine y={VOLUME_UPPER} stroke={VOLUME_UPPER_COLOR} strokeDasharray="4 4" strokeOpacity={0.6} />
            <ReferenceLine y={VOLUME_LOWER} stroke={VOLUME_LOWER_COLOR} strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip content={<VolumeTooltip />} />
            <Line type="monotone" dataKey="ratioPct" stroke={VOLUME_BASE_COLOR} strokeWidth={1.25} dot={false} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="aboveUpper"
              stroke={VOLUME_UPPER_COLOR}
              strokeWidth={1.75}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="belowLower"
              stroke={VOLUME_LOWER_COLOR}
              strokeWidth={1.75}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            {volumePeaks.map((p, i) => (
              <ReferenceDot key={i} x={p.time} y={p.ratioPct} r={3} fill={VOLUME_UPPER_COLOR} stroke="none" />
            ))}
            {volumeRows.length > 0 && (
              <ReferenceDot
                x={volumeRows[volumeRows.length - 1].time}
                y={volumeRows[volumeRows.length - 1].ratioPct}
                r={3}
                fill={volumeRows[volumeRows.length - 1].ratioPct >= VOLUME_UPPER ? VOLUME_UPPER_COLOR : volumeRows[volumeRows.length - 1].ratioPct <= VOLUME_LOWER ? VOLUME_LOWER_COLOR : VOLUME_BASE_COLOR}
                stroke="none"
                label={
                  <EndValueBadge
                    value={volumeRows[volumeRows.length - 1].ratioPct}
                    fill={
                      volumeRows[volumeRows.length - 1].ratioPct >= VOLUME_UPPER
                        ? VOLUME_UPPER_COLOR
                        : volumeRows[volumeRows.length - 1].ratioPct <= VOLUME_LOWER
                          ? VOLUME_LOWER_COLOR
                          : VOLUME_BASE_COLOR
                    }
                  />
                }
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        Tất cả số liệu tính từ khối lượng khớp lệnh thật của VNINDEX — không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
