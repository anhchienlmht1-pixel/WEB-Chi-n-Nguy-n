"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import {
  createChart,
  CandlestickSeries,
  BaselineSeries,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";
import { fetcher } from "@/lib/fetcher";
import { Candle } from "@/lib/types";
import { useTheme } from "@/lib/theme";

interface Response {
  symbol: string;
  candles: Candle[];
}

const HISTORY_RANGES = ["1M", "3M", "6M", "1Y", "2Y", "Tất cả"] as const;
const VIEWS = ["Trong ngày", ...HISTORY_RANGES] as const;
type View = (typeof VIEWS)[number];

const INTRADAY_REFRESH_MS = 5000;
const HISTORY_REFRESH_MS = 15000;

const UP_COLOR = { light: "#059669", dark: "#34d399" };
const DOWN_COLOR = { light: "#e11d48", dark: "#fb7185" };

function toCandlestickPoint(c: Candle) {
  return {
    time: c.time as unknown as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

function toLinePoint(c: Candle) {
  return { time: c.time as unknown as UTCTimestamp, value: c.close };
}

export function StockChart({ symbol, refPrice }: { symbol: string; refPrice?: number }) {
  const [view, setView] = useState<View>("Trong ngày");
  const isIntraday = view === "Trong ngày";
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Baseline"> | null>(null);
  const lastCandleCountRef = useRef(0);
  const lastViewRef = useRef(view);
  const { theme } = useTheme();

  const query = isIntraday
    ? `/api/candles?symbol=${symbol}&resolution=1`
    : `/api/candles?symbol=${symbol}&resolution=D&range=${encodeURIComponent(view)}`;

  const { data, error, isLoading } = useSWR<Response>(query, fetcher, {
    refreshInterval: isIntraday ? INTRADAY_REFRESH_MS : HISTORY_REFRESH_MS,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const textColor = theme === "dark" ? "#9ca3a0" : "#57534e";
    const gridColor = theme === "dark" ? "#1f2523" : "#e7e5e4";
    const borderColor = theme === "dark" ? "#2a2f2d" : "#d6d3d1";
    const up = theme === "dark" ? UP_COLOR.dark : UP_COLOR.light;
    const down = theme === "dark" ? DOWN_COLOR.dark : DOWN_COLOR.light;

    const chart = createChart(containerRef.current, {
      height: 380,
      layout: { background: { color: "transparent" }, textColor },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: isIntraday, secondsVisible: false },
    });

    const series = isIntraday
      ? chart.addSeries(BaselineSeries, {
          baseValue: { type: "price", price: refPrice ?? 0 },
          topLineColor: up,
          topFillColor1: `${up}33`,
          topFillColor2: `${up}05`,
          bottomLineColor: down,
          bottomFillColor1: `${down}05`,
          bottomFillColor2: `${down}33`,
          lineWidth: 2,
        })
      : chart.addSeries(CandlestickSeries, {
          upColor: up,
          downColor: down,
          borderUpColor: up,
          borderDownColor: down,
          wickUpColor: up,
          wickDownColor: down,
        });

    chartRef.current = chart;
    seriesRef.current = series;
    lastCandleCountRef.current = 0;

    const resize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, isIntraday]);

  useEffect(() => {
    if (!seriesRef.current || !data || data.candles.length === 0) return;

    const candles = data.candles;
    const viewChanged = lastViewRef.current !== view;
    const sameShape = !viewChanged && candles.length === lastCandleCountRef.current;
    const last = candles[candles.length - 1];

    // Live refresh: only the last (in-progress) bar changed — patch it in
    // place so the chart doesn't flicker or reset zoom/scroll position.
    if (isIntraday) {
      const series = seriesRef.current as ISeriesApi<"Baseline">;
      if (sameShape) series.update(toLinePoint(last));
      else series.setData(candles.map(toLinePoint));
    } else {
      const series = seriesRef.current as ISeriesApi<"Candlestick">;
      if (sameShape) series.update(toCandlestickPoint(last));
      else series.setData(candles.map(toCandlestickPoint));
    }

    if (!sameShape) {
      chartRef.current?.timeScale().fitContent();
      lastCandleCountRef.current = candles.length;
      lastViewRef.current = view;
    }
  }, [data, view, isIntraday]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                v === view
                  ? "bg-brand-600 text-white"
                  : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
          </span>
          Trực tiếp
        </span>
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Không thể tải dữ liệu biểu đồ cho {symbol}.
        </div>
      )}
      {!error && !isLoading && data && data.candles.length === 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
          {isIntraday
            ? `Chưa có dữ liệu khớp lệnh hôm nay cho ${symbol} (ngoài giờ giao dịch hoặc chưa mở phiên).`
            : `Không có dữ liệu biểu đồ cho ${symbol} trong khung thời gian này.`}
        </div>
      )}
      {isLoading && <div className="h-[380px] animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />}
      <div ref={containerRef} className={isLoading || (data && data.candles.length === 0) ? "hidden" : ""} />
    </div>
  );
}
