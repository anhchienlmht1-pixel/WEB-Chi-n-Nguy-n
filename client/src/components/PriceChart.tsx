import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { HistoryPoint } from "../types";
import { useTheme } from "../hooks/useTheme";
import { sma, rsi, macd } from "../utils/indicators";

export interface IndicatorToggles {
  sma: boolean;
  rsi: boolean;
  macd: boolean;
}

interface Props {
  points: HistoryPoint[];
  indicators: IndicatorToggles;
}

const UP = "#22c55e";
const DOWN = "#ef4444";

export default function PriceChart({ points, indicators }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

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

    if (indicators.sma) {
      for (const [length, color] of [
        [20, "#f59e0b"],
        [50, "#6366f1"],
      ] as const) {
        const line = sma(points, length);
        if (line.length === 0) continue;
        const series = chart.addSeries(LineSeries, { color, lineWidth: 1, title: `SMA ${length}` }, 0);
        series.setData(line.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      }
    }

    let panesUsed = 1;

    if (indicators.rsi) {
      const line = rsi(points, 14);
      if (line.length > 0) {
        const series = chart.addSeries(LineSeries, { color: "#8b5cf6", lineWidth: 1, title: "RSI 14" }, panesUsed);
        series.setData(line.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        panesUsed++;
      }
    }

    if (indicators.macd) {
      const line = macd(points);
      if (line.length > 0) {
        const macdLine = chart.addSeries(LineSeries, { color: "#0ea5e9", lineWidth: 1, title: "MACD" }, panesUsed);
        macdLine.setData(line.map((p) => ({ time: p.time as UTCTimestamp, value: p.macd })));
        const signalLine = chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, title: "Signal" }, panesUsed);
        signalLine.setData(line.map((p) => ({ time: p.time as UTCTimestamp, value: p.signal })));
        const hist = chart.addSeries(HistogramSeries, { title: "Histogram" }, panesUsed);
        hist.setData(
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
  }, [points, theme, indicators.sma, indicators.rsi, indicators.macd]);

  return <div ref={containerRef} className="w-full" />;
}
