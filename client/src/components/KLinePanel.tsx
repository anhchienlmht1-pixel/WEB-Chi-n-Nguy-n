import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActionType,
  CandleType,
  LineType,
  TooltipShowRule,
  dispose,
  init,
  registerOverlay,
  type Chart,
  type DeepPartial,
  type KLineData,
  type Styles,
} from "klinecharts";
import { fetchHistory } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { useTheme } from "../hooks/useTheme";
import { aggregatePoints, type ChartResolution } from "../utils/aggregate";
import { computeTradingSignals } from "../utils/signals";
import { useEntryGate } from "../hooks/useEntryGate";
import { dropUnclosedBars } from "../utils/sessionClose";

// Biểu đồ nến bằng KLineChart (Apache 2.0, không logo). Bố cục kiểu bàn làm
// việc: dải thông tin OHLC bằng HTML ở trên (đổi theo con trỏ), thanh công cụ
// gọn với nhóm phân đoạn, cột biểu tượng vẽ bên trái, khung khối lượng mảnh.
// Điểm Mua/Đóng lệnh của hệ thống tính từ phiên đã đóng.

const UP = "#12a150";
const DOWN = "#e5484d";
const FONT = "'Be Vietnam Pro', system-ui, sans-serif";

// Thẻ màu có mũi nhọn chỉ vào nến: Mua dưới đáy nến, Đóng lệnh trên đỉnh nến.
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
    const tip = y + d * 4;
    const color = buy ? UP : DOWN;
    return [
      {
        type: "polygon",
        attrs: { coordinates: [{ x, y: tip }, { x: x - 4, y: tip + d * 6 }, { x: x + 4, y: tip + d * 6 }] },
        styles: { style: "fill", color },
        ignoreEvent: true,
      },
      {
        type: "text",
        attrs: { x, y: tip + d * 6, text, align: "center", baseline: buy ? "top" : "bottom" },
        styles: {
          color: "#ffffff",
          size: 10,
          weight: 600,
          family: FONT,
          backgroundColor: color,
          borderRadius: 3,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
        },
        ignoreEvent: true,
      },
    ];
  },
});

type Ind = "MA" | "BOLL" | "MACD" | "RSI";
const MAIN_INDS: Ind[] = ["MA", "BOLL"];

const ic = (d: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const TOOLS: { name: string; label: string; icon: ReactNode }[] = [
  { name: "segment", label: "Đoạn thẳng", icon: ic(<><path d="M5 19 19 5" /><circle cx="5" cy="19" r="1.6" /><circle cx="19" cy="5" r="1.6" /></>) },
  { name: "rayLine", label: "Tia", icon: ic(<><path d="M5 19 21 3" /><circle cx="5" cy="19" r="1.6" /></>) },
  { name: "horizontalStraightLine", label: "Đường ngang", icon: ic(<path d="M3 12h18" />) },
  { name: "priceChannelLine", label: "Kênh giá", icon: ic(<><path d="M3 16 15 4" /><path d="M9 20 21 8" /></>) },
  { name: "fibonacciLine", label: "Fibonacci", icon: ic(<><path d="M3 5h18M3 10h18M3 14h18M3 19h18" strokeDasharray="0" /></>) },
];

function themeStyles(dark: boolean): DeepPartial<Styles> {
  const text = dark ? "#9aa58d" : "#7a8272";
  const grid = dark ? "rgba(239,231,212,0.06)" : "rgba(31,43,29,0.06)";
  const axis = dark ? "rgba(239,231,212,0.12)" : "rgba(31,43,29,0.12)";
  const tick = { color: text, family: FONT, size: 11 };
  const cross = { color: dark ? "rgba(230,200,120,0.55)" : "rgba(138,106,30,0.5)", dashedValue: [4, 3] };
  const crossText = { backgroundColor: dark ? "#3a3218" : "#1f2b1d", borderColor: "transparent", family: FONT, size: 11, color: "#ffffff" };
  return {
    grid: { horizontal: { color: grid, style: LineType.Dashed, dashedValue: [3, 3] }, vertical: { show: false } },
    candle: {
      bar: { upColor: UP, downColor: DOWN, noChangeColor: "#a39a7a", upBorderColor: UP, downBorderColor: DOWN, upWickColor: UP, downWickColor: DOWN },
      area: {
        lineColor: "#c9a24a",
        lineSize: 2,
        backgroundColor: [
          { offset: 0, color: "rgba(201,162,74,0.01)" },
          { offset: 1, color: "rgba(201,162,74,0.22)" },
        ],
      },
      priceMark: {
        high: { color: text, textFamily: FONT },
        low: { color: text, textFamily: FONT },
        last: { upColor: UP, downColor: DOWN, line: { style: LineType.Dashed, dashedValue: [3, 3] }, text: { family: FONT, borderRadius: 3 } },
      },
      // Thông tin OHLC hiển thị bằng HTML phía trên, không vẽ lên canvas.
      tooltip: { showRule: TooltipShowRule.None },
    },
    indicator: {
      bars: [{ upColor: "rgba(18,161,80,0.35)", downColor: "rgba(229,72,77,0.35)", noChangeColor: "rgba(163,154,122,0.4)" }],
      lines: [
        { color: "#d08a1e", size: 1.2 },
        { color: "#2f7fd6", size: 1.2 },
        { color: "#a14fc4", size: 1.2 },
        { color: "#14a3a3", size: 1.2 },
        { color: "#d6456b", size: 1.2 },
      ],
      lastValueMark: { show: false },
      tooltip: { showName: true, showParams: true, text: { color: text, family: FONT, size: 11, marginTop: 6 } },
    },
    xAxis: { axisLine: { color: axis }, tickLine: { show: false }, tickText: tick },
    yAxis: { axisLine: { show: false }, tickLine: { show: false }, tickText: tick },
    separator: { color: axis, size: 1 },
    crosshair: {
      horizontal: { line: cross, text: crossText },
      vertical: { line: cross, text: crossText },
    },
  };
}

const fmtP = (v: number) => v.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtV = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tr` : Math.round(v).toLocaleString("vi-VN"));
const fmtD = (ts: number) => {
  const d = new Date(ts + 7 * 3600_000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};

// Nhóm phân đoạn: nền mờ chung, mục đang chọn nổi lên như một viên thẻ.
function Seg<T extends string>({ items, value, onChange, label }: { items: { v: T; t: ReactNode; title?: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md bg-[rgba(127,120,90,0.12)] p-0.5">
      {items.map((it) => {
        const on = it.v === value;
        return (
          <button
            key={it.v}
            type="button"
            title={it.title}
            aria-pressed={on}
            onClick={() => onChange(it.v)}
            className={`inline-flex h-7 min-w-8 items-center justify-center rounded-[5px] px-2.5 text-[0.8rem] font-semibold transition-colors ${
              on ? "bg-[var(--sm-pop)] text-[var(--sm-egg)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-[var(--sm-mut)] hover:text-[var(--sm-egg)]"
            }`}
          >
            {it.t}
          </button>
        );
      })}
    </div>
  );
}

const iconBtn = (on = false) =>
  `inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
    on ? "bg-[rgba(201,162,74,0.18)] text-[var(--sm-gold2)]" : "text-[var(--sm-mut)] hover:bg-[rgba(127,120,90,0.12)] hover:text-[var(--sm-egg)]"
  }`;

export default function KLinePanel({ symbol, height = 400, fill = false }: { symbol: string; height?: number; fill?: boolean }) {
  const { theme } = useTheme();
  const boxRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [res, setRes] = useState<ChartResolution>("D");
  const resRef = useRef(res);
  resRef.current = res;
  const [area, setArea] = useState(false);
  const [inds, setInds] = useState<Ind[]>([]);
  const [showSignals, setShowSignals] = useState(true);
  const [tool, setTool] = useState<string | null>(null);
  const [hover, setHover] = useState<{ bar: KLineData; prev?: KLineData } | null>(null);

  const hist = usePolling(() => fetchHistory(symbol, "MAX"), [symbol], 60_000);
  const points = useMemo(() => (hist.data ? aggregatePoints(hist.data.points, res) : []), [hist.data, res]);
  const gate = useEntryGate(symbol);
  const signals = useMemo(() => {
    const src = hist.data?.points;
    if (!src || symbol === "VNINDEX" || !gate.ready) return [];
    return computeTradingSignals(aggregatePoints(dropUnclosedBars(src), res), gate.allow).transitions;
  }, [hist.data, res, symbol, gate]);

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
          if (type !== 2) return `${dd}/${mm}/${yy}`;
          return resRef.current === "D" ? `${dd}/${mm}` : resRef.current === "W" ? `${mm}/${String(yy).slice(2)}` : String(yy);
        },
      },
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.setPriceVolumePrecision(2, 0);
    chart.setOffsetRightDistance(28);
    chart.createIndicator({ name: "VOL", calcParams: [], createTooltipDataSource: () => ({ name: "", calcParamsText: "", icons: [], values: [] }) }, false, { id: "vol", height: 70, dragEnabled: false });
    const onCross = (d?: unknown) => {
      const c = d as { kLineData?: KLineData; dataIndex?: number } | undefined;
      if (!c?.kLineData) return setHover(null);
      const list = chart.getDataList();
      setHover({ bar: c.kLineData, prev: c.dataIndex ? list[c.dataIndex - 1] : undefined });
    };
    chart.subscribeAction(ActionType.OnCrosshairChange, onCross);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.unsubscribeAction(ActionType.OnCrosshairChange, onCross);
      dispose(el);
      chartRef.current = null;
    };
  }, [symbol]);

  useEffect(() => {
    chartRef.current?.setStyles(themeStyles(theme === "dark"));
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

  // Chỉ báo: MA/BOLL chồng trên nến, MACD/RSI có khung riêng bên dưới.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const n of MAIN_INDS) chart.removeIndicator("candle_pane", n);
    chart.removeIndicator("macd");
    chart.removeIndicator("rsi");
    for (const n of inds) {
      if (MAIN_INDS.includes(n)) chart.createIndicator(n === "MA" ? { name: "MA", calcParams: [20, 50] } : n, true, { id: "candle_pane" });
      else chart.createIndicator(n, false, { id: n.toLowerCase(), height: 80, dragEnabled: false });
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
  const full = () => (document.fullscreenElement ? document.exitFullscreen() : wrapRef.current?.requestFullscreen());

  // Dải OHLC: nến dưới con trỏ, hoặc nến mới nhất khi không rê chuột.
  const lastK = points.length
    ? (() => {
        const p = points[points.length - 1];
        const q = points[points.length - 2];
        const k = (x: typeof p) => ({ timestamp: new Date(x.time).getTime(), open: x.open, high: x.high, low: x.low, close: x.close, volume: x.volume });
        return { bar: k(p), prev: q ? k(q) : undefined };
      })()
    : null;
  const cur = hover ?? lastK;
  const chg = cur?.prev ? (cur.bar.close / cur.prev.close - 1) * 100 : null;
  const tone = chg == null ? "text-[var(--sm-egg)]" : chg > 0 ? "up" : chg < 0 ? "down" : "text-[var(--sm-mut)]";

  return (
    <div
      ref={wrapRef}
      className={`flex flex-col overflow-hidden rounded-md border border-[var(--sm-line)] bg-[var(--sm-panel)] ${fill ? "lg:h-full" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--sm-line2)] px-3 py-2">
        <Seg
          label="Khung thời gian"
          value={res}
          onChange={setRes}
          items={[
            { v: "D", t: "Ngày" },
            { v: "W", t: "Tuần" },
            { v: "M", t: "Tháng" },
          ]}
        />
        <Seg
          label="Kiểu biểu đồ"
          value={area ? "a" : "c"}
          onChange={(v) => setArea(v === "a")}
          items={[
            {
              v: "c",
              title: "Nến",
              t: ic(<><path d="M8 3v4M8 15v6M16 3v6M16 17v4" /><rect x="5.5" y="7" width="5" height="8" rx="1" /><rect x="13.5" y="9" width="5" height="8" rx="1" /></>),
            },
            { v: "a", title: "Đường", t: ic(<path d="M3 17l5-6 4 3 4-7 5 5" />) },
          ]}
        />
        <div role="group" aria-label="Chỉ báo" className="flex items-center gap-1">
          {(["MA", "BOLL", "MACD", "RSI"] as Ind[]).map((n) => {
            const on = inds.includes(n);
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                title={n === "MA" ? "Trung bình động 20 và 50" : undefined}
                onClick={() => setInds((xs) => (on ? xs.filter((x) => x !== n) : [...xs, n]))}
                className={`inline-flex h-7 items-center rounded-md border px-2 text-[0.78rem] font-semibold transition-colors ${
                  on
                    ? "border-[var(--sm-gold)] bg-[rgba(201,162,74,0.12)] text-[var(--sm-gold2)]"
                    : "border-[var(--sm-line)] text-[var(--sm-mut)] hover:text-[var(--sm-egg)]"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showSignals}
          onClick={() => setShowSignals((v) => !v)}
          className="inline-flex h-7 items-center gap-2 rounded-md px-1.5 text-[0.8rem] font-semibold text-[var(--sm-egg2)]"
        >
          <span className={`relative h-4 w-7 rounded-full transition-colors ${showSignals ? "bg-[var(--sm-gold)]" : "bg-[rgba(127,120,90,0.3)]"}`}>
            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-[left] ${showSignals ? "left-3.5" : "left-0.5"}`} />
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-0 w-0 border-x-[4px] border-b-[6px] border-x-transparent" style={{ borderBottomColor: UP }} />
            <i className="inline-block h-0 w-0 border-x-[4px] border-t-[6px] border-x-transparent" style={{ borderTopColor: DOWN }} />
            Tín hiệu
          </span>
        </button>
        <span className="ml-auto flex items-center">
          <button type="button" className={iconBtn()} onClick={shot} title="Tải ảnh biểu đồ" aria-label="Tải ảnh biểu đồ">
            {ic(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>)}
          </button>
          <button type="button" className={iconBtn()} onClick={full} title="Toàn màn hình" aria-label="Toàn màn hình">
            {ic(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />)}
          </button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-11 shrink-0 flex-col items-center gap-1 border-r border-[var(--sm-line2)] py-2 sm:flex">
          {TOOLS.map((t) => (
            <button key={t.name} type="button" className={iconBtn(tool === t.name)} onClick={() => draw(t.name)} title={t.label} aria-label={t.label}>
              {t.icon}
            </button>
          ))}
          <span className="my-1 h-px w-6 bg-[var(--sm-line)]" />
          <button
            type="button"
            className={iconBtn()}
            onClick={() => TOOLS.forEach((t) => chartRef.current?.removeOverlay({ name: t.name }))}
            title="Xóa nét vẽ"
            aria-label="Xóa nét vẽ"
          >
            {ic(<><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>)}
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {cur && (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-3 pt-2 text-[0.8rem] tabular-nums">
              <span className="font-semibold text-[var(--sm-egg)]">
                {symbol} <span className="font-normal text-[var(--sm-mut)]">· {fmtD(cur.bar.timestamp)}</span>
              </span>
              {(
                [
                  ["Mở", cur.bar.open],
                  ["Cao", cur.bar.high],
                  ["Thấp", cur.bar.low],
                  ["Đóng", cur.bar.close],
                ] as const
              ).map(([k, v]) => (
                <span key={k}>
                  <span className="text-[var(--sm-mut)]">{k} </span>
                  <b className={`font-semibold ${tone}`}>{fmtP(v)}</b>
                </span>
              ))}
              {chg != null && (
                <b className={`font-semibold ${tone}`}>
                  {chg > 0 ? "+" : ""}
                  {chg.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%
                </b>
              )}
              <span>
                <span className="text-[var(--sm-mut)]">KL </span>
                <b className="font-semibold text-[var(--sm-egg)]">{fmtV(cur.bar.volume ?? 0)}</b>
              </span>
            </div>
          )}
          <div className="relative min-h-0 flex-1" style={{ height: fill ? undefined : height, minHeight: height }}>
            {/* Watermark: con bò trong logo Chiến Nguyễn Invest, mờ, nằm dưới nến. */}
            <img
              src="/watermark-bull.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute top-1/2 left-1/2 w-[34%] max-w-[340px] min-w-[140px] -translate-x-1/2 -translate-y-[60%] select-none opacity-[0.08] dark:opacity-[0.1]"
            />
            <div ref={boxRef} className="absolute inset-0" />
            {points.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[0.9rem] text-[var(--sm-mut)]">
                {hist.loading ? "Đang tải biểu đồ..." : hist.error ? `Lỗi tải biểu đồ: ${hist.error}` : "Không có dữ liệu biểu đồ"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
