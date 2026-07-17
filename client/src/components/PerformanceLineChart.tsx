import { useEffect, useMemo, useRef } from "react";
import { createChart, LineSeries, ColorType, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useTheme } from "../hooks/useTheme";
import type { ReturnPoint } from "../utils/portfolio";

export interface PerfLineSpec {
  key: string;
  label: string;
  color: string;
  bold?: boolean;
  data: ReturnPoint[];
}

function fmt(v: number | undefined): string {
  return v === undefined ? "--" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default function PerformanceLineChart({ series, height = 360 }: { series: PerfLineSpec[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const seriesKey = useMemo(
    () => series.map((s) => `${s.key}:${s.color}:${s.bold ? 1 : 0}:${s.data.length}`).join("|"),
    [series]
  );

  useEffect(() => {
    if (!containerRef.current || !legendRef.current) return;
    const dark = theme === "dark";

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: dark ? "#94a3b8" : "#64748b" },
      grid: {
        vertLines: { color: dark ? "#1e293b" : "#e2e8f0" },
        horzLines: { color: dark ? "#1e293b" : "#e2e8f0" },
      },
      rightPriceScale: { borderColor: dark ? "#1e293b" : "#e2e8f0" },
      timeScale: { borderColor: dark ? "#1e293b" : "#e2e8f0" },
      height,
      width: containerRef.current.clientWidth,
    });

    const lineByKey = new Map<string, ISeriesApi<"Line">>();
    for (const s of series) {
      if (s.data.length === 0) continue;
      const line = chart.addSeries(LineSeries, {
        color: s.color,
        lineWidth: s.bold ? 3 : 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      line.setData(s.data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      lineByKey.set(s.key, line);
    }

    const zero = chart.addSeries(LineSeries, {
      color: dark ? "#334155" : "#cbd5e1",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const allTimes = series.flatMap((s) => s.data.map((p) => p.time));
    if (allTimes.length > 0) {
      const minT = Math.min(...allTimes) as UTCTimestamp;
      const maxT = Math.max(...allTimes) as UTCTimestamp;
      zero.setData([
        { time: minT, value: 0 },
        { time: maxT, value: 0 },
      ]);
    }

    chart.timeScale().fitContent();

    function renderLegend(valuesByKey: Map<string, number>) {
      const rows = series
        .filter((s) => s.data.length > 0)
        .map((s) => `<span style="color:${s.color}" class="font-medium">${s.label} ${fmt(valuesByKey.get(s.key))}</span>`);
      legendRef.current!.innerHTML = rows.join(" ");
    }

    function lastValues(): Map<string, number> {
      const m = new Map<string, number>();
      for (const s of series) {
        const last = s.data[s.data.length - 1];
        if (last) m.set(s.key, last.value);
      }
      return m;
    }
    renderLegend(lastValues());

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        renderLegend(lastValues());
        return;
      }
      const m = new Map<string, number>();
      for (const [key, line] of lineByKey) {
        const d = param.seriesData.get(line) as { value: number } | undefined;
        if (d) m.set(key, d.value);
      }
      renderLegend(m);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey, theme, height]);

  return (
    <div className="relative w-full">
      <div
        ref={legendRef}
        className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-white/70 px-2 py-1.5 text-xs backdrop-blur-sm dark:bg-slate-950/60"
      />
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
