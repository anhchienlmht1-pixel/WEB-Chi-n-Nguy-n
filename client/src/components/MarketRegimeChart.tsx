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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
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

// "Trạng thái thị trường qua các năm" — VNINDEX's full history, shaded by
// the same regime classification as MarketOverviewBanner (utils/
// marketRegime.ts), with the % gain reached after each fresh move into
// "Tích cực" labeled directly on the chart. The panel below plots VNINDEX's
// own matched volume against its trailing 250-session average, the same
// money-flow proxy the banner's gauge reads off of.
export default function MarketRegimeChart() {
  const { data } = usePolling(() => fetchHistory("VNINDEX", "MAX"), [], 5 * 60 * 1000);

  const { series, bands, transitions, volumeRows } = useMemo(() => {
    if (!data) return { series: [], bands: [], transitions: [], volumeRows: [] };
    const daily = aggregatePoints(data.points, "D");
    const regimeSeries = computeMarketRegimeSeries(daily);
    const regimeBands = collapseRegimeBands(regimeSeries);
    const positiveTransitions = findPositiveTransitions(regimeSeries, regimeBands);

    const volumeRows = regimeSeries.map((bar, i) => {
      const windowStart = Math.max(0, i - 249);
      const windowBars = regimeSeries.slice(windowStart, i + 1);
      const avgVol = windowBars.reduce((sum, b) => sum + b.volume, 0) / windowBars.length;
      return { time: bar.time, ratioPct: avgVol > 0 ? (bar.volume / avgVol) * 100 : 0 };
    });

    return { series: regimeSeries, bands: regimeBands, transitions: positiveTransitions, volumeRows };
  }, [data]);

  if (series.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <History className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
          Trạng thái thị trường qua các năm
        </h3>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        VNINDEX theo ngày. Nền màu là trạng thái thị trường; số % là mức tăng tới đỉnh đạt được sau mỗi lần chuyển
        sang Tích cực.
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
              tickFormatter={(t: string) => new Date(t).getFullYear().toString()}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              minTickGap={60}
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
        Khối lượng khớp lệnh so với mức bình thường của 250 phiên
      </h4>
      <div className="mt-2 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={volumeRows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="time"
              tickFormatter={(t: string) => new Date(t).getFullYear().toString()}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              minTickGap={60}
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
