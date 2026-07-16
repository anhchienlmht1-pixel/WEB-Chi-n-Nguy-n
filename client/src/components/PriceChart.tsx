import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { HistoryPoint } from "../types";
import { useTheme } from "../hooks/useTheme";
import { findIndicatorDef, type IndicatorLinePoint } from "../utils/indicatorCatalog";
import { formatVolume } from "../utils/format";

export interface ActiveIndicator {
  instanceId: string;
  defId: string;
  params: Record<string, number>;
}

interface Props {
  points: HistoryPoint[];
  activeIndicators: ActiveIndicator[];
}

const UP = "#22c55e";
const DOWN = "#ef4444";

function fmt(value: number | undefined | null, digits = 2): string {
  return value === undefined || value === null || !Number.isFinite(value) ? "--" : value.toFixed(digits);
}

export default function PriceChart({ points, activeIndicators }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();
  const indicatorsKey = useMemo(
    () => activeIndicators.map((i) => `${i.instanceId}:${i.defId}:${JSON.stringify(i.params)}`).join("|"),
    [activeIndicators]
  );

  useEffect(() => {
    if (!containerRef.current || !legendRef.current) return;

    const dark = theme === "dark";
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: dark ? "#94a3b8" : "#64748b",
      },
      grid: {
        vertLines: { color: dark ? "#1e293b" : "#e2e8f0" },
        horzLines: { color: dark ? "#1e293b" : "#e2e8f0" },
      },
      rightPriceScale: { borderColor: dark ? "#1e293b" : "#e2e8f0" },
      timeScale: { borderColor: dark ? "#1e293b" : "#e2e8f0" },
      height: 420,
      width: containerRef.current.clientWidth,
    });
    chartRef.current = chart;

    const candles = chart.addSeries(
      CandlestickSeries,
      {
        upColor: UP,
        downColor: DOWN,
        borderUpColor: UP,
        borderDownColor: DOWN,
        wickUpColor: UP,
        wickDownColor: DOWN,
      },
      0
    );
    candles.setData(
      points.map((p) => ({
        time: Math.floor(new Date(p.time).getTime() / 1000) as UTCTimestamp,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }))
    );
    candles.priceScale().applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } });

    const volume = chart.addSeries(
      HistogramSeries,
      { priceFormat: { type: "volume" }, priceScaleId: "volume", lastValueVisible: false, priceLineVisible: false },
      0
    );
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    volume.setData(
      points.map((p) => ({
        time: Math.floor(new Date(p.time).getTime() / 1000) as UTCTimestamp,
        value: p.volume,
        color: p.close >= p.open ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)",
      }))
    );

    interface RenderedLine {
      key: string;
      label: string;
      color: string;
      series: ISeriesApi<"Line"> | ISeriesApi<"Histogram">;
      data: IndicatorLinePoint[];
    }
    interface RenderedIndicator {
      instanceId: string;
      name: string;
      lines: RenderedLine[];
    }
    const rendered: RenderedIndicator[] = [];

    let paneIndex = 1;
    for (const active of activeIndicators) {
      const def = findIndicatorDef(active.defId);
      if (!def) continue;
      const targetPane = def.category === "overlay" ? 0 : paneIndex;
      const output = def.compute(points, active.params);
      const lines: RenderedLine[] = [];
      for (const spec of def.lines) {
        const data = output[spec.key] ?? [];
        if (data.length === 0) continue;
        if (spec.histogram) {
          const series = chart.addSeries(
            HistogramSeries,
            { color: spec.color, lastValueVisible: false, priceLineVisible: false },
            targetPane
          );
          series.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          lines.push({ key: spec.key, label: spec.label, color: spec.color, series, data });
        } else {
          const series = chart.addSeries(
            LineSeries,
            { color: spec.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
            targetPane
          );
          series.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          lines.push({ key: spec.key, label: spec.label, color: spec.color, series, data });
        }
      }
      if (lines.length > 0) {
        rendered.push({ instanceId: active.instanceId, name: def.nameEn, lines });
        if (def.category === "oscillator") paneIndex++;
      }
    }

    chart.timeScale().fitContent();

    // On-chart legend (top-left): OHLC + volume always shown, plus one
    // colored row per active indicator line — live-updating with the
    // crosshair, falling back to the latest bar otherwise.
    const legendEl = legendRef.current;

    function renderLegend(
      bar: { open: number; high: number; low: number; close: number } | undefined,
      vol: number | undefined,
      valuesByLine: Map<ISeriesApi<"Line"> | ISeriesApi<"Histogram">, number>
    ) {
      const changeColor = bar && bar.close >= bar.open ? UP : DOWN;
      const rows: string[] = [];
      rows.push(
        `<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">` +
          `<span class="text-[11px] font-semibold text-slate-700 dark:text-slate-200">OHLC</span>` +
          `<span class="text-[11px] tabular-nums" style="color:${changeColor}">O${fmt(bar?.open)} H${fmt(bar?.high)} L${fmt(bar?.low)} C${fmt(bar?.close)}</span>` +
          `</div>`
      );
      rows.push(
        `<div class="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">KL ${vol !== undefined ? formatVolume(vol) : "--"}</div>`
      );
      for (const ind of rendered) {
        const parts = ind.lines
          .map((l) => `<span style="color:${l.color}">${l.label} ${fmt(valuesByLine.get(l.series))}</span>`)
          .join(" ");
        rows.push(`<div class="flex flex-wrap gap-x-2 text-[11px] tabular-nums font-medium">${parts}</div>`);
      }
      legendEl.innerHTML = rows.join("");
    }

    function lastOf(data: IndicatorLinePoint[]): number | undefined {
      return data[data.length - 1]?.value;
    }

    function renderDefault() {
      const lastBar = points[points.length - 1];
      const valuesByLine = new Map<ISeriesApi<"Line"> | ISeriesApi<"Histogram">, number>();
      for (const ind of rendered) {
        for (const l of ind.lines) {
          const v = lastOf(l.data);
          if (v !== undefined) valuesByLine.set(l.series, v);
        }
      }
      renderLegend(lastBar, lastBar?.volume, valuesByLine);
    }

    renderDefault();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        renderDefault();
        return;
      }
      const bar = param.seriesData.get(candles) as { open: number; high: number; low: number; close: number } | undefined;
      const vol = param.seriesData.get(volume) as { value: number } | undefined;
      const valuesByLine = new Map<ISeriesApi<"Line"> | ISeriesApi<"Histogram">, number>();
      for (const ind of rendered) {
        for (const l of ind.lines) {
          const v = param.seriesData.get(l.series) as { value: number } | undefined;
          if (v) valuesByLine.set(l.series, v.value);
        }
      }
      renderLegend(bar, vol?.value, valuesByLine);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, theme, indicatorsKey]);

  return (
    <div className="relative w-full">
      <div
        ref={legendRef}
        className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-0.5 rounded-md bg-white/70 px-2 py-1.5 backdrop-blur-sm dark:bg-slate-950/60"
      />
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
