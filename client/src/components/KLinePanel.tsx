import { useEffect, useMemo, useRef, useState } from "react";
import { CandleType, dispose, init, registerOverlay, type Chart, type DeepPartial, type Styles } from "klinecharts";
import { fetchHistory } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useTheme } from "../hooks/useTheme";
import { aggregatePoints, type ChartResolution } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";
import { dropUnclosedBars } from "../utils/sessionClose";

// Bản phác thảo biểu đồ nến bằng KLineChart (Apache 2.0, không logo):
// khung Ngày/Tuần/Tháng, nến/đường, chỉ báo, công cụ vẽ và điểm Mua/Đóng lệnh
// của hệ thống (tính từ phiên đã đóng). Dữ liệu vẫn lấy từ server của web.

const UP = "#16a34a";
const DOWN = "#e5484d";

// Tam giác + chữ cho điểm Mua (dưới nến) và Đóng lệnh (trên nến).
registerOverlay({
  name: "bsSignal",
  totalStep: 1,
  lock: true,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  createPointFigures: ({ overlay, coordinates }) => {
    const { buy, text } = overlay.extendData as { buy: boolean; text: string };
    const { x, y } = coordinates[0];
    const d = buy ? 1 : -1;
    const tip = y + d * 6;
    const color = buy ? UP : DOWN;
    return [
      {
        type: "polygon",
        attrs: { coordinates: [{ x, y: tip }, { x: x - 5, y: tip + d * 9 }, { x: x + 5, y: tip + d * 9 }] },
        styles: { style: "fill", color },
        ignoreEvent: true,
      },
      {
        type: "text",
        attrs: { x, y: tip + d * 12, text, align: "center", baseline: buy ? "top" : "bottom" },
        styles: { color, size: 11, backgroundColor: "transparent", paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0 },
        ignoreEvent: true,
      },
    ];
  },
});

type Ind = "MA" | "BOLL" | "MACD" | "RSI";
const MAIN_INDS: Ind[] = ["MA", "BOLL"];
const TOOLS: { name: string; label: string }[] = [
  { name: "segment", label: "Đoạn thẳng" },
  { name: "rayLine", label: "Tia" },
  { name: "horizontalStraightLine", label: "Đường ngang" },
  { name: "priceChannelLine", label: "Kênh giá" },
  { name: "fibonacciLine", label: "Fibonacci" },
];

function themeStyles(dark: boolean): DeepPartial<Styles> {
  const text = dark ? "#9aa58d" : "#64748b";
  const grid = dark ? "#1f2a1d" : "#eef0ea";
  const axis = dark ? "#2a3828" : "#e2e5dc";
  return {
    grid: { horizontal: { color: grid }, vertical: { color: grid } },
    candle: {
      bar: { upColor: UP, downColor: DOWN, noChangeColor: "#a39a7a", upBorderColor: UP, downBorderColor: DOWN, upWickColor: UP, downWickColor: DOWN },
      area: { lineColor: "#c9a24a", backgroundColor: [{ offset: 0, color: "rgba(201,162,74,0.02)" }, { offset: 1, color: "rgba(201,162,74,0.28)" }] },
      priceMark: { last: { upColor: UP, downColor: DOWN } },
      tooltip: {
        text: { color: text },
        custom: [
          { title: "Ngày ", value: "{time}" },
          { title: "Mở ", value: "{open}" },
          { title: "Cao ", value: "{high}" },
          { title: "Thấp ", value: "{low}" },
          { title: "Đóng ", value: "{close}" },
          { title: "KL ", value: "{volume}" },
        ],
      },
    },
    indicator: {
      bars: [{ upColor: "rgba(22,163,74,0.45)", downColor: "rgba(229,72,77,0.45)", noChangeColor: "#a39a7a" }],
      tooltip: { text: { color: text } },
    },
    xAxis: { axisLine: { color: axis }, tickLine: { color: axis }, tickText: { color: text } },
    yAxis: { axisLine: { color: axis }, tickLine: { color: axis }, tickText: { color: text } },
    separator: { color: axis },
    crosshair: {
      horizontal: { line: { color: "#c9a24a" }, text: { backgroundColor: "#8a6a1e" } },
      vertical: { line: { color: "#c9a24a" }, text: { backgroundColor: "#8a6a1e" } },
    },
  };
}

const btn = (on: boolean) =>
  `inline-flex min-h-8 items-center rounded-[3px] px-2.5 text-[0.82rem] font-medium transition-colors ${
    on ? "bg-[var(--sm-gold)] text-[#1b1608]" : "text-[var(--sm-egg2)] hover:bg-[rgba(201,162,74,0.12)]"
  }`;

export default function KLinePanel({ symbol, height = 400, fill = false }: { symbol: string; height?: number; fill?: boolean }) {
  const { theme } = useTheme();
  const boxRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [res, setRes] = useState<ChartResolution>("D");
  const [area, setArea] = useState(false);
  const [inds, setInds] = useState<Ind[]>([]);
  const [showSignals, setShowSignals] = useState(true);
  const [tool, setTool] = useState<string | null>(null);

  const hist = usePolling(() => fetchHistory(symbol, "MAX"), [symbol], 60_000);
  const points = useMemo(() => (hist.data ? aggregatePoints(hist.data.points, res) : []), [hist.data, res]);
  const signals = useMemo(() => {
    const src = hist.data?.points;
    if (!src || symbol === "VNINDEX") return [];
    return computeTradingSignals(aggregatePoints(dropUnclosedBars(src), res)).transitions;
  }, [hist.data, res, symbol]);

  // Tạo biểu đồ một lần cho mỗi mã.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const chart = init(el, {
      locale: "en-US",
      timezone: "Asia/Ho_Chi_Minh",
      customApi: {
        formatDate: (_f, ts, _fmt, type) => {
          const d = new Date(ts + 7 * 3600_000);
          const dd = String(d.getUTCDate()).padStart(2, "0");
          const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
          const yy = d.getUTCFullYear();
          return type === 2 ? (res === "D" ? `${dd}/${mm}` : `${mm}/${yy}`) : `${dd}/${mm}/${yy}`;
        },
      },
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.setPriceVolumePrecision(2, 0);
    chart.setOffsetRightDistance(24);
    chart.createIndicator("VOL", false, { id: "vol", height: 80 });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      dispose(el);
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    const dark = theme === "dark";
    chartRef.current?.setStyles(themeStyles(dark));
  }, [theme, symbol]);

  useEffect(() => {
    chartRef.current?.setStyles({ candle: { type: area ? CandleType.Area : CandleType.CandleSolid } });
  }, [area, symbol]);

  // Nạp dữ liệu và vẽ lại điểm tín hiệu.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || points.length === 0) return;
    chart.applyNewData(
      points.map((p) => ({ timestamp: new Date(p.time).getTime(), open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume })),
    );
    chart.setBarSpace(res === "D" ? 7 : 10);
    chart.removeOverlay({ name: "bsSignal" });
    if (!showSignals) return;
    const byTs = new Map(points.map((p) => [new Date(p.time).getTime(), p]));
    const byDay = new Map(points.map((p) => [p.time.slice(0, 10), p]));
    for (const sg of signals) {
      const ts = sg.time * 1000;
      const bar = byTs.get(ts) ?? byDay.get(new Date(ts + 7 * 3600_000).toISOString().slice(0, 10));
      if (!bar) continue;
      const buy = sg.type === "buy";
      chart.createOverlay({
        name: "bsSignal",
        points: [{ timestamp: new Date(bar.time).getTime(), value: buy ? bar.low : bar.high }],
        extendData: { buy, text: sg.note ?? (buy ? "Mua" : "Đóng lệnh") },
      });
    }
  }, [points, signals, showSignals, res]);

  // Chỉ báo: MA/BOLL nằm chồng trên nến, MACD/RSI có khung riêng bên dưới.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const n of MAIN_INDS) chart.removeIndicator("candle_pane", n);
    chart.removeIndicator("macd");
    chart.removeIndicator("rsi");
    for (const n of inds) {
      if (MAIN_INDS.includes(n)) chart.createIndicator(n, true, { id: "candle_pane" });
      else chart.createIndicator(n, false, { id: n.toLowerCase(), height: 80 });
    }
  }, [inds, symbol]);

  function draw(name: string) {
    setTool(name);
    chartRef.current?.createOverlay({ name, onDrawEnd: () => (setTool(null), false) });
  }

  function shot() {
    const url = chartRef.current?.getConvertPictureUrl(true, "png", theme === "dark" ? "#121a11" : "#ffffff");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}-chart.png`;
    a.click();
  }

  const wrapRef = useRef<HTMLDivElement>(null);
  const full = () => (document.fullscreenElement ? document.exitFullscreen() : wrapRef.current?.requestFullscreen());

  return (
    <div
      ref={wrapRef}
      className={`flex flex-col overflow-hidden rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] ${fill ? "lg:h-full" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--sm-line2)] px-2 py-1.5">
        <b className="mr-1 px-1 text-[0.85rem] text-[var(--sm-egg)]">{symbol}</b>
        {(["D", "W", "M"] as ChartResolution[]).map((r) => (
          <button key={r} type="button" className={btn(res === r)} onClick={() => setRes(r)}>
            {r === "D" ? "Ngày" : r === "W" ? "Tuần" : "Tháng"}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-[var(--sm-line)]" />
        <button type="button" className={btn(!area)} onClick={() => setArea(false)}>Nến</button>
        <button type="button" className={btn(area)} onClick={() => setArea(true)}>Đường</button>
        <span className="mx-1 h-5 w-px bg-[var(--sm-line)]" />
        {(["MA", "BOLL", "MACD", "RSI"] as Ind[]).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={inds.includes(n)}
            className={btn(inds.includes(n))}
            onClick={() => setInds((xs) => (xs.includes(n) ? xs.filter((x) => x !== n) : [...xs, n]))}
          >
            {n}
          </button>
        ))}
        <button type="button" aria-pressed={showSignals} className={btn(showSignals)} onClick={() => setShowSignals((v) => !v)}>
          Mua/Bán
        </button>
        <span className="ml-auto flex items-center gap-1">
          <button type="button" className={btn(false)} onClick={shot} title="Tải ảnh biểu đồ" aria-label="Tải ảnh biểu đồ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </button>
          <button type="button" className={btn(false)} onClick={full} title="Toàn màn hình" aria-label="Toàn màn hình">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[7.5rem] shrink-0 flex-col gap-0.5 border-r border-[var(--sm-line2)] p-1.5 sm:flex">
          {TOOLS.map((t) => (
            <button key={t.name} type="button" className={`${btn(tool === t.name)} justify-start`} onClick={() => draw(t.name)}>
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className={`${btn(false)} mt-1 justify-start text-[var(--sm-dn)]!`}
            onClick={() => TOOLS.forEach((t) => chartRef.current?.removeOverlay({ name: t.name }))}
          >
            Xóa nét vẽ
          </button>
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: fill ? undefined : height, minHeight: height }}>
          <div ref={boxRef} className="absolute inset-0" />
          {points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[0.9rem] text-[var(--sm-mut)]">
              {hist.loading ? "Đang tải biểu đồ..." : hist.error ? `Lỗi tải biểu đồ: ${hist.error}` : "Không có dữ liệu biểu đồ"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
