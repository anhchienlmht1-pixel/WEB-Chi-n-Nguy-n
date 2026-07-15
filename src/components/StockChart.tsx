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
      layout: { background: { color: "transparent" }, textColor: "#525252" },
      grid: {
        vertLines: { color: "#f1f1f1" },
        horzLines: { color: "#f1f1f1" },
      },
      rightPriceScale: { borderColor: "#e5e5e5" },
      timeScale: { borderColor: "#e5e5e5" },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#f43f5e",
      downColor: "#10b981",
      borderUpColor: "#f43f5e",
      borderDownColor: "#10b981",
      wickUpColor: "#f43f5e",
      wickDownColor: "#10b981",
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={clsx(
              "rounded-md px-2.5 py-1 text-xs font-medium",
              r === range ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Không thể tải dữ liệu biểu đồ cho {symbol}.
        </div>
      )}
      {isLoading && <div className="h-[380px] animate-pulse rounded-lg bg-neutral-100" />}
      <div ref={containerRef} className={isLoading ? "hidden" : ""} />
    </div>
  );
}
