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
import { sma, rsi, macd } from "../utils/indicators";
import { formatVolume } from "../utils/format";

export interface IndicatorToggles {
  maPeriods: number[];
  rsi: boolean;
  macd: boolean;
}

interface Props {
  points: HistoryPoint[];
  indicators: IndicatorToggles;
}

const UP = "#22c55e";
const DOWN = "#ef4444";

// Distinct color per MA period, chosen to read clearly on both themes —
// mirrors the multi-MA legend look of TradingView/broker charting tools.
const MA_COLORS: Record<number, string> = {
  10: "#f43f5e",
  20: "#f59e0b",
  50: "#14b8a6",
  200: "#7c3aed",
};

function fmt(value: number | undefined | null, digits = 2): string {
  return value === undefined || value === null || !Number.isFinite(value) ? "--" : value.toFixed(digits);
}

export default function PriceChart({ points, indicators }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();
  const maPeriodsKey = useMemo(() => indicators.maPeriods.join(","), [indicators.maPeriods]);

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
    const candleData = points.map((p) => ({
      time: Math.floor(new Date(p.time).getTime() / 1000) as UTCTimestamp,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }));
    candles.setData(candleData);
    candles.priceScale().applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } });

    const volume = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        lastValueVisible: false,
        priceLineVisible: false,
      },
      0
    );
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: false,
    });
    volume.setData(
      points.map((p) => ({
        time: Math.floor(new Date(p.time).getTime() / 1000) as UTCTimestamp,
        value: p.volume,
        color: p.close >= p.open ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)",
      }))
    );

    const maSeries: { period: number; color: string; series: ISeriesApi<"Line"> }[] = [];
    for (const period of indicators.maPeriods) {
      const color = MA_COLORS[period] ?? "#94a3b8";
      const line = sma(points, period);
      if (line.length === 0) continue;
      const series = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, 0);
      series.setData(line.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      maSeries.push({ period, color, series });
    }

    let panesUsed = 1;
    let rsiSeries: ISeriesApi<"Line"> | null = null;

    if (indicators.rsi) {
      const line = rsi(points, 14);
      if (line.length > 0) {
        rsiSeries = chart.addSeries(
          LineSeries,
          { color: "#8b5cf6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
          panesUsed
        );
        rsiSeries.setData(line.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        panesUsed++;
      }
    }

    let macdLineSeries: ISeriesApi<"Line"> | null = null;
    let macdSignalSeries: ISeriesApi<"Line"> | null = null;
    let macdHistSeries: ISeriesApi<"Histogram"> | null = null;

    if (indicators.macd) {
      const line = macd(points);
      if (line.length > 0) {
        macdLineSeries = chart.addSeries(
          LineSeries,
          { color: "#0ea5e9", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
          panesUsed
        );
        macdLineSeries.setData(line.map((p) => ({ time: p.time as UTCTimestamp, value: p.macd })));
        macdSignalSeries = chart.addSeries(
          LineSeries,
          { color: "#f97316", lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
          panesUsed
        );
        macdSignalSeries.setData(line.map((p) => ({ time: p.time as UTCTimestamp, value: p.signal })));
        macdHistSeries = chart.addSeries(HistogramSeries, { lastValueVisible: false, priceLineVisible: false }, panesUsed);
        macdHistSeries.setData(
          line.map((p) => ({
            time: p.time as UTCTimestamp,
            value: p.histogram,
            color: p.histogram >= 0 ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
          }))
        );
        panesUsed++;
      }
    }

    chart.timeScale().fitContent();

    // On-chart legend (top-left), TradingView-style: OHLC + volume always
    // shown, plus one colored line per active indicator, live-updating as
    // the crosshair moves and falling back to the latest bar otherwise.
    const legendEl = legendRef.current;

    function renderLegend(
      bar: { open: number; high: number; low: number; close: number } | undefined,
      vol: number | undefined,
      maValues: Map<number, number>,
      rsiValue: number | undefined,
      macdValues: { macd: number; signal: number; histogram: number } | undefined
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
      for (const { period, color } of maSeries) {
        rows.push(
          `<div class="text-[11px] tabular-nums font-medium" style="color:${color}">MA${period}: ${fmt(maValues.get(period))}</div>`
        );
      }
      if (rsiSeries) {
        rows.push(`<div class="text-[11px] tabular-nums font-medium" style="color:#8b5cf6">RSI 14: ${fmt(rsiValue)}</div>`);
      }
      if (macdLineSeries) {
        rows.push(
          `<div class="flex flex-wrap gap-x-2 text-[11px] tabular-nums font-medium">` +
            `<span style="color:#0ea5e9">MACD ${fmt(macdValues?.macd)}</span>` +
            `<span style="color:#f97316">Signal ${fmt(macdValues?.signal)}</span>` +
            `<span style="color:${(macdValues?.histogram ?? 0) >= 0 ? UP : DOWN}">Hist ${fmt(macdValues?.histogram)}</span>` +
            `</div>`
        );
      }
      legendEl.innerHTML = rows.join("");
    }

    function lastValue<T extends { time: number }>(arr: T[]): T | undefined {
      return arr[arr.length - 1];
    }

    const maLines = indicators.maPeriods.map((period) => ({ period, points: sma(points, period) }));
    const rsiLine = indicators.rsi ? rsi(points, 14) : [];
    const macdLine = indicators.macd ? macd(points) : [];

    function renderDefault() {
      const lastBar = points[points.length - 1];
      const maValues = new Map<number, number>();
      for (const { period, points: line } of maLines) {
        const last = lastValue(line);
        if (last) maValues.set(period, last.value);
      }
      renderLegend(
        lastBar,
        lastBar?.volume,
        maValues,
        lastValue(rsiLine)?.value,
        lastValue(macdLine)
      );
    }

    renderDefault();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        renderDefault();
        return;
      }
      const bar = param.seriesData.get(candles) as { open: number; high: number; low: number; close: number } | undefined;
      const vol = param.seriesData.get(volume) as { value: number } | undefined;
      const maValues = new Map<number, number>();
      for (const { period, series } of maSeries) {
        const v = param.seriesData.get(series) as { value: number } | undefined;
        if (v) maValues.set(period, v.value);
      }
      const rsiV = rsiSeries ? (param.seriesData.get(rsiSeries) as { value: number } | undefined)?.value : undefined;
      let macdV: { macd: number; signal: number; histogram: number } | undefined;
      if (macdLineSeries && macdSignalSeries && macdHistSeries) {
        const m = param.seriesData.get(macdLineSeries) as { value: number } | undefined;
        const s = param.seriesData.get(macdSignalSeries) as { value: number } | undefined;
        const h = param.seriesData.get(macdHistSeries) as { value: number } | undefined;
        if (m && s && h) macdV = { macd: m.value, signal: s.value, histogram: h.value };
      }
      renderLegend(bar, vol?.value, maValues, rsiV, macdV);
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
  }, [points, theme, maPeriodsKey, indicators.rsi, indicators.macd]);

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
