"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { createChart, CandlestickSeries, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { fetcher } from "@/lib/fetcher";
import { Candle } from "@/lib/types";

interface Response {
  symbol: string;
  candles: Candle[];
}

const RANGES = ["1M", "3M", "6M", "1Y", "2Y"] as const;
const REFRESH_MS = 15000;

function toChartCandle(c: Candle) {
  return {
    time: c.time as unknown as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("6M");
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastCandleCountRef = useRef(0);

  const { data, error, isLoading } = useSWR<Response>(
    `/api/candles?symbol=${symbol}&resolution=D&range=${range}`,
    fetcher,
    { refreshInterval: REFRESH_MS }
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height: 380,
      layout: { background: { color: "transparent" }, textColor: "#9ca3a0" },
      grid: {
        vertLines: { color: "#1f2523" },
        horzLines: { color: "#1f2523" },
      },
      rightPriceScale: { borderColor: "#2a2f2d" },
      timeScale: { borderColor: "#2a2f2d" },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderUpColor: "#34d399",
      borderDownColor: "#fb7185",
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
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
  }, []);

  const lastRangeRef = useRef(range);

  useEffect(() => {
    if (!seriesRef.current || !data || data.candles.length === 0) return;

    const candles = data.candles;
    const rangeChanged = lastRangeRef.current !== range;
    const sameShape = !rangeChanged && candles.length === lastCandleCountRef.current;

    if (sameShape) {
      // Live refresh: only the last (in-progress) candle changed — patch it
      // in place so the chart doesn't flicker or reset zoom/scroll position.
      seriesRef.current.update(toChartCandle(candles[candles.length - 1]));
    } else {
      seriesRef.current.setData(candles.map(toChartCandle));
      chartRef.current?.timeScale().fitContent();
      lastCandleCountRef.current = candles.length;
      lastRangeRef.current = range;
    }
  }, [data, range]);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                r === range ? "bg-brand-600 text-white" : "text-neutral-400 hover:bg-neutral-800"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
          </span>
          Trực tiếp
        </span>
      </div>
      {error && (
        <div className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">
          Không thể tải dữ liệu biểu đồ cho {symbol}.
        </div>
      )}
      {!error && !isLoading && data && data.candles.length === 0 && (
        <div className="rounded-xl bg-amber-950/20 p-3 text-sm text-amber-300">
          Không có dữ liệu biểu đồ cho {symbol} trong khung thời gian này.
        </div>
      )}
      {isLoading && <div className="h-[380px] animate-pulse rounded-xl bg-neutral-800" />}
      <div ref={containerRef} className={isLoading || (data && data.candles.length === 0) ? "hidden" : ""} />
    </div>
  );
}
