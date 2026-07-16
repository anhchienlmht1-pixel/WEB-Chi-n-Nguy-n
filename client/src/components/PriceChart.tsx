import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type Time,
} from "lightweight-charts";
import type { HistoryPoint } from "../types";
import { useTheme } from "../hooks/useTheme";
import { findIndicatorDef, type IndicatorLinePoint } from "../utils/indicatorCatalog";
import { formatVolume } from "../utils/format";
import { TrendLinePrimitive, RectanglePrimitive, TextPrimitive, type DrawPoint } from "../utils/drawingPrimitives";

export interface ActiveIndicator {
  instanceId: string;
  defId: string;
  params: Record<string, number>;
}

export type ChartType = "candlestick" | "bar" | "line" | "area";
export type DrawingTool = "trendline" | "hline" | "rectangle" | "text" | null;

export interface PriceChartHandle {
  takeScreenshot(): string;
  clearDrawings(): void;
}

interface Props {
  points: HistoryPoint[];
  activeIndicators: ActiveIndicator[];
  chartType: ChartType;
  drawingTool: DrawingTool;
  onDrawingComplete: () => void;
}

const UP = "#22c55e";
const DOWN = "#ef4444";
const DRAW_COLOR = "#f59e0b";

function fmt(value: number | undefined | null, digits = 2): string {
  return value === undefined || value === null || !Number.isFinite(value) ? "--" : value.toFixed(digits);
}

type MainSeries = ISeriesApi<"Candlestick" | "Bar" | "Line" | "Area">;
type Drawing =
  | { kind: "line"; primitive: TrendLinePrimitive }
  | { kind: "rectangle"; primitive: RectanglePrimitive }
  | { kind: "text"; primitive: TextPrimitive }
  | { kind: "hline"; price: number; priceLine: ReturnType<MainSeries["createPriceLine"]> };

const PriceChart = forwardRef<PriceChartHandle, Props>(function PriceChart(
  { points, activeIndicators, chartType, drawingTool, onDrawingComplete },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<MainSeries | null>(null);
  const drawingsRef = useRef<Drawing[]>([]);
  const pendingPointRef = useRef<DrawPoint | null>(null);
  const drawingToolRef = useRef<DrawingTool>(drawingTool);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  const { theme } = useTheme();

  drawingToolRef.current = drawingTool;
  onDrawingCompleteRef.current = onDrawingComplete;

  useImperativeHandle(ref, () => ({
    takeScreenshot() {
      return chartRef.current?.takeScreenshot().toDataURL("image/png") ?? "";
    },
    clearDrawings() {
      const series = mainSeriesRef.current;
      if (!series) return;
      for (const d of drawingsRef.current) {
        if (d.kind === "hline") series.removePriceLine(d.priceLine);
        else series.detachPrimitive(d.primitive);
      }
      drawingsRef.current = [];
    },
  }));

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

    const candleData = points.map((p) => ({
      time: Math.floor(new Date(p.time).getTime() / 1000) as UTCTimestamp,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }));

    let mainSeries: MainSeries;
    if (chartType === "bar") {
      mainSeries = chart.addSeries(BarSeries, { upColor: UP, downColor: DOWN }, 0);
      mainSeries.setData(candleData);
    } else if (chartType === "line") {
      mainSeries = chart.addSeries(LineSeries, { color: "#0ea5e9", lineWidth: 2 }, 0);
      mainSeries.setData(candleData.map((c) => ({ time: c.time, value: c.close })));
    } else if (chartType === "area") {
      mainSeries = chart.addSeries(
        AreaSeries,
        { lineColor: "#0ea5e9", topColor: "rgba(14,165,233,0.35)", bottomColor: "rgba(14,165,233,0.02)" },
        0
      );
      mainSeries.setData(candleData.map((c) => ({ time: c.time, value: c.close })));
    } else {
      mainSeries = chart.addSeries(
        CandlestickSeries,
        { upColor: UP, downColor: DOWN, borderUpColor: UP, borderDownColor: DOWN, wickUpColor: UP, wickDownColor: DOWN },
        0
      );
      mainSeries.setData(candleData);
    }
    mainSeries.priceScale().applyOptions({ scaleMargins: { top: 0.05, bottom: 0.25 } });
    mainSeriesRef.current = mainSeries;

    // Re-attach drawings created before this remount (theme/indicator/type
    // changes tear down and recreate the whole chart) so they survive it.
    for (const d of drawingsRef.current) {
      if (d.kind === "hline") {
        d.priceLine = mainSeries.createPriceLine({
          price: d.price,
          color: DRAW_COLOR,
          lineWidth: 2,
          lineStyle: 2,
          title: "",
        });
      } else {
        mainSeries.attachPrimitive(d.primitive);
      }
    }

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
      label: string;
      color: string;
      series: ISeriesApi<"Line"> | ISeriesApi<"Histogram">;
      data: IndicatorLinePoint[];
    }
    interface RenderedIndicator {
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
          const series = chart.addSeries(HistogramSeries, { color: spec.color, lastValueVisible: false, priceLineVisible: false }, targetPane);
          series.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          lines.push({ label: spec.label, color: spec.color, series, data });
        } else {
          const series = chart.addSeries(LineSeries, { color: spec.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, targetPane);
          series.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          lines.push({ label: spec.label, color: spec.color, series, data });
        }
      }
      if (lines.length > 0) {
        rendered.push({ lines });
        if (def.category === "oscillator") paneIndex++;
      }
    }

    chart.timeScale().fitContent();

    const pointsByTime = new Map(points.map((p) => [Math.floor(new Date(p.time).getTime() / 1000), p]));

    const legendEl = legendRef.current;

    function renderLegend(
      bar: HistoryPoint | undefined,
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
        `<div class="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">KL ${bar ? formatVolume(bar.volume) : "--"}</div>`
      );
      for (const ind of rendered) {
        const parts = ind.lines.map((l) => `<span style="color:${l.color}">${l.label} ${fmt(valuesByLine.get(l.series))}</span>`).join(" ");
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
      renderLegend(lastBar, valuesByLine);
    }

    renderDefault();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        renderDefault();
        return;
      }
      const bar = pointsByTime.get(param.time as number);
      const valuesByLine = new Map<ISeriesApi<"Line"> | ISeriesApi<"Histogram">, number>();
      for (const ind of rendered) {
        for (const l of ind.lines) {
          const v = param.seriesData.get(l.series) as { value: number } | undefined;
          if (v) valuesByLine.set(l.series, v.value);
        }
      }
      renderLegend(bar, valuesByLine);
    });

    // Drawing tools — only active on the main price pane (index 0), where
    // pixel Y is already local to that pane's own coordinate space.
    chart.subscribeClick((param) => {
      const tool = drawingToolRef.current;
      if (!tool || param.paneIndex !== 0 || !param.time || param.point === undefined) return;
      const price = mainSeries.coordinateToPrice(param.point.y);
      if (price === null) return;
      const point: DrawPoint = { time: param.time as Time, price };

      if (tool === "hline") {
        const priceLine = mainSeries.createPriceLine({ price, color: DRAW_COLOR, lineWidth: 2, lineStyle: 2, title: "" });
        drawingsRef.current.push({ kind: "hline", price, priceLine });
        onDrawingCompleteRef.current();
        return;
      }

      if (tool === "text") {
        const text = window.prompt("Nhập văn bản:");
        if (text) {
          const primitive = new TextPrimitive(point, text, DRAW_COLOR);
          mainSeries.attachPrimitive(primitive);
          drawingsRef.current.push({ kind: "text", primitive });
        }
        onDrawingCompleteRef.current();
        return;
      }

      // trendline / rectangle need two clicks
      if (!pendingPointRef.current) {
        pendingPointRef.current = point;
        return;
      }
      const p1 = pendingPointRef.current;
      pendingPointRef.current = null;
      if (tool === "trendline") {
        const primitive = new TrendLinePrimitive(p1, point, DRAW_COLOR);
        mainSeries.attachPrimitive(primitive);
        drawingsRef.current.push({ kind: "line", primitive });
      } else if (tool === "rectangle") {
        const primitive = new RectanglePrimitive(p1, point, DRAW_COLOR);
        mainSeries.attachPrimitive(primitive);
        drawingsRef.current.push({ kind: "rectangle", primitive });
      }
      onDrawingCompleteRef.current();
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
      mainSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, theme, indicatorsKey, chartType]);

  return (
    <div className="relative w-full">
      <div
        ref={legendRef}
        className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-0.5 rounded-md bg-white/70 px-2 py-1.5 backdrop-blur-sm dark:bg-slate-950/60"
      />
      <div ref={containerRef} className="w-full" />
    </div>
  );
});

export default PriceChart;
