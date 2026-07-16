"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ColorType,
} from "lightweight-charts";
import { fetcher } from "@/lib/fetcher";
import { Candle } from "@/lib/types";
import { ChartResolution } from "@/lib/aggregate";
import { sma, rsi, macd } from "@/lib/indicators";
import { useTheme } from "@/lib/theme";

interface Response {
  candles: Candle[];
}

const RESOLUTION_TABS: { value: ChartResolution; label: string }[] = [
  { value: "D", label: "Ngày" },
  { value: "W", label: "Tuần" },
  { value: "M", label: "Tháng" },
];

const UP_COLOR = "#059669";
const DOWN_COLOR = "#e11d48";

type IndicatorKey = "sma" | "rsi" | "macd";

export function StockChart({ symbol }: { symbol: string }) {
  const [resolution, setResolution] = useState<ChartResolution>("D");
  const [indicators, setIndicators] = useState<Record<IndicatorKey, boolean>>({
    sma: true,
    rsi: false,
    macd: false,
  });
  const { theme } = useTheme();

  const { data, error, isLoading } = useSWR<Response>(
    `/api/candles?symbol=${symbol}&resolution=${resolution}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const candles = useMemo(() => data?.candles ?? [], [data]);

  function toggleIndicator(key: IndicatorKey) {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const isDark = theme === "dark";
    const textColor = isDark ? "#a3a3a3" : "#525252";
    const gridColor = isDark ? "#262626" : "#f0f0f0";
    const borderColor = isDark ? "#262626" : "#e5e5e5";

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: resolution === "D" },
      autoSize: true,
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(
      CandlestickSeries,
      {
        upColor: UP_COLOR,
        downColor: DOWN_COLOR,
        borderUpColor: UP_COLOR,
        borderDownColor: DOWN_COLOR,
        wickUpColor: UP_COLOR,
        wickDownColor: DOWN_COLOR,
      },
      0
    );
    candleSeries.setData(candles.map((c) => ({ time: c.time as never, open: c.open, high: c.high, low: c.low, close: c.close })));
    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } });

    const volumeSeries = chart.addSeries(
      HistogramSeries,
      { priceScaleId: "volume", priceFormat: { type: "volume" } },
      0
    );
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeries.setData(
      candles.map((c, i) => ({
        time: c.time as never,
        value: c.volume,
        color: i === 0 || c.close >= candles[i - 1].close ? `${UP_COLOR}80` : `${DOWN_COLOR}80`,
      }))
    );

    if (indicators.sma) {
      for (const [length, color] of [
        [20, "#f59e0b"],
        [50, "#6366f1"],
      ] as const) {
        const points = sma(candles, length);
        if (points.length === 0) continue;
        const line = chart.addSeries(LineSeries, { color, lineWidth: 1, title: `SMA ${length}` }, 0);
        line.setData(points.map((p) => ({ time: p.time as never, value: p.value })));
      }
    }

    let panesUsed = 1;

    if (indicators.rsi) {
      const points = rsi(candles, 14);
      if (points.length > 0) {
        const rsiSeries = chart.addSeries(LineSeries, { color: "#8b5cf6", lineWidth: 1, title: "RSI 14" }, panesUsed);
        rsiSeries.setData(points.map((p) => ({ time: p.time as never, value: p.value })));
        panesUsed++;
      }
    }

    if (indicators.macd) {
      const points = macd(candles);
      if (points.length > 0) {
        const macdLine = chart.addSeries(LineSeries, { color: "#0ea5e9", lineWidth: 1, title: "MACD" }, panesUsed);
        macdLine.setData(points.map((p) => ({ time: p.time as never, value: p.macd })));
        const signalLine = chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, title: "Signal" }, panesUsed);
        signalLine.setData(points.map((p) => ({ time: p.time as never, value: p.signal })));
        const histSeries = chart.addSeries(HistogramSeries, { title: "Histogram" }, panesUsed);
        histSeries.setData(
          points.map((p) => ({
            time: p.time as never,
            value: p.histogram,
            color: p.histogram >= 0 ? `${UP_COLOR}80` : `${DOWN_COLOR}80`,
          }))
        );
        panesUsed++;
      }
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, resolution, indicators, theme]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800">
        <div className="flex gap-1 rounded-full bg-neutral-100 p-1 text-xs font-semibold dark:bg-neutral-800">
          {RESOLUTION_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setResolution(tab.value)}
              className={clsx(
                "rounded-full px-3 py-1 transition-colors",
                resolution === tab.value
                  ? "bg-white text-brand-700 shadow-sm dark:bg-neutral-700 dark:text-brand-300"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["sma", "SMA 20/50"],
              ["rsi", "RSI 14"],
              ["macd", "MACD"],
            ] as [IndicatorKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleIndicator(key)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                indicators[key]
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[420px] w-full p-2">
        <div ref={containerRef} className="h-full w-full" />

        {isLoading && (
          <div className="absolute inset-2 flex items-center justify-center bg-white/60 dark:bg-neutral-900/60">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}

        {!isLoading && (error || !data) && (
          <div className="absolute inset-2 flex items-center justify-center text-sm text-red-600 dark:text-red-400">
            Không thể tải dữ liệu biểu đồ cho {symbol}.
          </div>
        )}

        {!isLoading && data && candles.length === 0 && (
          <div className="absolute inset-2 flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
            Chưa có dữ liệu biểu đồ.
          </div>
        )}
      </div>
    </div>
  );
}
