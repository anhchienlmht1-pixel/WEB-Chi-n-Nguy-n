"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import clsx from "clsx";
import { Camera, Maximize, Minimize } from "lucide-react";
import {
  createChart,
  CandlestickSeries,
  BaselineSeries,
  HistogramSeries,
  PriceScaleMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";
import { fetcher } from "@/lib/fetcher";
import { Candle } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { formatChange, formatPercent, formatPrice, formatVolume } from "@/lib/format";

interface Response {
  symbol: string;
  candles: Candle[];
}

// Each tab picks the candle *period*, not just a lookback window — "Tuần"
// means every candle covers a week, "Tháng" a month, etc.
const HISTORY_VIEWS = ["Ngày", "Tuần", "Tháng"] as const;
const VIEWS = ["Trong ngày", ...HISTORY_VIEWS] as const;
type View = (typeof VIEWS)[number];

const HISTORY_RESOLUTION: Record<(typeof HISTORY_VIEWS)[number], "D" | "W" | "M"> = {
  "Ngày": "D",
  "Tuần": "W",
  "Tháng": "M",
};

const SCALE_MODES: { label: string; mode: PriceScaleMode }[] = [
  { label: "Linear", mode: PriceScaleMode.Normal },
  { label: "Log", mode: PriceScaleMode.Logarithmic },
  { label: "%", mode: PriceScaleMode.Percentage },
];

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

function toVolumePoint(c: Candle, up: string, down: string) {
  return {
    time: c.time as unknown as UTCTimestamp,
    value: c.volume,
    color: c.close >= c.open ? `${up}80` : `${down}80`,
  };
}

interface HoverStats {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function StockChart({ symbol, refPrice }: { symbol: string; refPrice?: number }) {
  const [view, setView] = useState<View>("Trong ngày");
  const [scaleMode, setScaleMode] = useState<PriceScaleMode>(PriceScaleMode.Normal);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isIntraday = view === "Trong ngày";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Baseline"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastCandleCountRef = useRef(0);
  const lastViewRef = useRef(view);
  const { theme } = useTheme();
  const [hover, setHover] = useState<HoverStats | null>(null);

  const query = isIntraday
    ? `/api/candles?symbol=${symbol}&resolution=1`
    : `/api/candles?symbol=${symbol}&resolution=${HISTORY_RESOLUTION[view as (typeof HISTORY_VIEWS)[number]]}`;

  const { data, error, isLoading } = useSWR<Response>(query, fetcher, {
    refreshInterval: isIntraday ? INTRADAY_REFRESH_MS : HISTORY_REFRESH_MS,
  });
  const candles = useMemo(() => data?.candles ?? [], [data]);
  const hasCandles = candles.length > 0;

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const textColor = theme === "dark" ? "#9ca3a0" : "#57534e";
    const gridColor = theme === "dark" ? "#1f2523" : "#e7e5e4";
    const borderColor = theme === "dark" ? "#2a2f2d" : "#d6d3d1";
    const up = theme === "dark" ? UP_COLOR.dark : UP_COLOR.light;
    const down = theme === "dark" ? DOWN_COLOR.dark : DOWN_COLOR.light;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor, mode: scaleMode, scaleMargins: { top: 0.08, bottom: 0.22 } },
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

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chart.subscribeCrosshairMove((param) => {
      const bar = param.seriesData.get(series);
      const vol = param.seriesData.get(volumeSeries);
      if (!bar) {
        setHover(null);
        return;
      }
      if ("open" in bar) {
        setHover({
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: vol && "value" in vol ? vol.value : 0,
        });
      } else if ("value" in bar) {
        setHover({ open: bar.value, high: bar.value, low: bar.value, close: bar.value, volume: vol && "value" in vol ? vol.value : 0 });
      }
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;
    lastCandleCountRef.current = 0;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, isIntraday]);

  useEffect(() => {
    chartRef.current?.priceScale("right").applyOptions({ mode: scaleMode });
  }, [scaleMode]);

  useEffect(() => {
    if (!seriesRef.current || !volumeSeriesRef.current || !hasCandles) return;

    const up = theme === "dark" ? UP_COLOR.dark : UP_COLOR.light;
    const down = theme === "dark" ? DOWN_COLOR.dark : DOWN_COLOR.light;
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

    if (sameShape) {
      volumeSeriesRef.current.update(toVolumePoint(last, up, down));
    } else {
      volumeSeriesRef.current.setData(candles.map((c) => toVolumePoint(c, up, down)));
    }

    if (!sameShape) {
      chartRef.current?.timeScale().fitContent();
      lastCandleCountRef.current = candles.length;
      lastViewRef.current = view;
    }
  }, [candles, hasCandles, view, isIntraday, theme]);

  function handleScreenshot() {
    if (!chartRef.current) return;
    const canvas = chartRef.current.takeScreenshot();
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${symbol}-${view}.png`;
    a.click();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Default to the latest candle's OHLC until the user actually hovers the
  // chart — computed at render time (not stored in state) so there's
  // nothing to synchronize inside the data-loading effect above.
  const lastCandle = candles[candles.length - 1];
  const displayStats: HoverStats | null =
    hover ?? (lastCandle ? { open: lastCandle.open, high: lastCandle.high, low: lastCandle.low, close: lastCandle.close, volume: lastCandle.volume } : null);

  const changeVsRef = displayStats && refPrice ? displayStats.close - refPrice : null;
  const changePctVsRef = displayStats && refPrice ? ((displayStats.close - refPrice) / refPrice) * 100 : null;
  const hoverColor =
    changeVsRef === null ? "text-neutral-500 dark:text-neutral-400" : changeVsRef >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";

  return (
    <div
      ref={wrapperRef}
      className={clsx(
        "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-lg dark:shadow-black/20",
        isFullscreen && "flex h-screen flex-col"
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
          <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          {SCALE_MODES.map((s) => (
            <button
              key={s.label}
              onClick={() => setScaleMode(s.mode)}
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                scaleMode === s.mode
                  ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50"
                  : "text-neutral-400 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-neutral-800"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
            </span>
            Trực tiếp
          </span>
          <button
            onClick={handleScreenshot}
            title="Lưu ảnh biểu đồ"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Camera size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        </div>
      </div>

      {/*
        The chart container stays mounted and normally laid out at all
        times (never display:none) — lightweight-charts' autoSize reads the
        container's real dimensions via ResizeObserver, and hiding it with
        `hidden` collapses that to 0x0, which previously left fitContent()
        racing against the container becoming visible again and squashing
        all the candles into a sliver on one edge. Loading/error/empty
        states overlay on top instead of replacing the container.
      */}
      <div className={clsx("relative h-[380px]", isFullscreen && "h-full flex-1")}>
        {error && (
          <div className="absolute inset-0 z-20 flex items-start rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            <div>
              Không thể tải dữ liệu biểu đồ cho {symbol}.
              {error instanceof Error && error.message && (
                <div className="mt-1 text-xs opacity-75">{error.message}</div>
              )}
            </div>
          </div>
        )}
        {!error && !isLoading && data && !hasCandles && (
          <div className="absolute inset-0 z-20 flex items-start rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
            <div>
              {isIntraday
                ? `Chưa có dữ liệu khớp lệnh hôm nay cho ${symbol} (ngoài giờ giao dịch hoặc chưa mở phiên).`
                : `Không có dữ liệu biểu đồ cho ${symbol} trong khung thời gian này.`}
            </div>
          </div>
        )}
        {isLoading && <div className="absolute inset-0 z-20 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />}

        {displayStats && !isLoading && (
          <div className="pointer-events-none absolute left-1 top-1 z-10 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium tabular-nums text-neutral-600 backdrop-blur-sm dark:bg-neutral-900/80 dark:text-neutral-300">
            <span className="font-bold text-neutral-800 dark:text-neutral-100">{symbol}</span>
            <span>O {formatPrice(displayStats.open)}</span>
            <span>H {formatPrice(displayStats.high)}</span>
            <span>L {formatPrice(displayStats.low)}</span>
            <span>C {formatPrice(displayStats.close)}</span>
            {changeVsRef !== null && changePctVsRef !== null && (
              <span className={hoverColor}>
                {formatChange(changeVsRef)} ({formatPercent(changePctVsRef)})
              </span>
            )}
            <span className="text-neutral-400 dark:text-neutral-500">KL {formatVolume(displayStats.volume)}</span>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
