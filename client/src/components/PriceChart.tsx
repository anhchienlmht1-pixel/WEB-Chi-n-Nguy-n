import { useEffect, useRef } from "react";
import { AreaSeries, ColorType, createChart, type IChartApi } from "lightweight-charts";
import type { HistoryPoint } from "../types";

interface Props {
  points: HistoryPoint[];
  positive: boolean;
}

export default function PriceChart({ points, positive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      rightPriceScale: { borderColor: "#1e293b" },
      timeScale: { borderColor: "#1e293b" },
      height: 360,
      width: containerRef.current.clientWidth,
    });
    chartRef.current = chart;

    const lineColor = positive ? "#22c55e" : "#ef4444";
    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: positive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
      bottomColor: "rgba(15,23,42,0)",
      lineWidth: 2,
    });

    series.setData(
      points.map((p) => ({
        time: (new Date(p.time).getTime() / 1000) as any,
        value: p.close,
      }))
    );
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
  }, [points, positive]);

  return <div ref={containerRef} className="w-full" />;
}
