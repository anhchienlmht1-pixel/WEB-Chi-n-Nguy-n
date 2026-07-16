import { useEffect, useRef } from "react";
import { AreaSeries, ColorType, createChart, type IChartApi } from "lightweight-charts";
import type { HistoryPoint } from "../types";
import { useTheme } from "../hooks/useTheme";

interface Props {
  points: HistoryPoint[];
  positive: boolean;
}

export default function PriceChart({ points, positive }: Props) {
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
      height: 400,
      width: containerRef.current.clientWidth,
    });
    chartRef.current = chart;

    const lineColor = positive ? (dark ? "#22c55e" : "#16a34a") : dark ? "#ef4444" : "#dc2626";
    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: positive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)",
      bottomColor: "rgba(0,0,0,0)",
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
  }, [points, positive, theme]);

  return <div ref={containerRef} className="w-full" />;
}
