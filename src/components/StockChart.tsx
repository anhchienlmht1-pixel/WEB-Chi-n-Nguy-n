"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { createChart, CandlestickSeries, IChartApi, ISeriesApi } from "lightweight-charts";
import { fetcher } from "@/lib/fetcher";
import { Candle } from "@/lib/types";

interface Response {
  symbol: string;
  candles: Candle[];
}

const RANGES = ["1M", "3M", "6M", "1Y", "2Y"] as const;

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("6M");
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { data, error, isLoading } = useSWR<Response>(
    `/api/candles?symbol=${symbol}&resolution=D&range=${range}`,
    fetcher
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
      upColor: "#fb7185",
      downColor: "#34d399",
      borderUpColor: "#fb7185",
      borderDownColor: "#34d399",
      wickUpColor: "#fb7185",
      wickDownColor: "#34d399",
    });

    chartRef.current = chart;
    seriesRef.current = series;

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

  useEffect(() => {
    if (!seriesRef.current || !data) return;
    seriesRef.current.setData(
      data.candles.map((c) => ({
        time: c.time as unknown as import("lightweight-charts").UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center gap-1">
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
      {error && (
        <div className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">
          Không thể tải dữ liệu biểu đồ cho {symbol}.
        </div>
      )}
      {isLoading && <div className="h-[380px] animate-pulse rounded-xl bg-neutral-800" />}
      <div ref={containerRef} className={isLoading ? "hidden" : ""} />
    </div>
  );
}
