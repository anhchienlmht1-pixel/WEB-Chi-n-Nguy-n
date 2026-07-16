import {
  sma,
  ema,
  wma,
  bollingerbands,
  keltnerchannels,
  vwap,
  psar,
  ichimokucloud,
  rsi,
  macd,
  stochastic,
  stochasticrsi,
  williamsr,
  cci,
  roc,
  trix,
  adx,
  atr,
  awesomeoscillator,
  adl,
  obv,
  mfi,
  forceindex,
} from "technicalindicators";
import type { HistoryPoint } from "../types";

export interface IndicatorLinePoint {
  time: number; // unix seconds
  value: number;
}

export interface IndicatorLineSpec {
  key: string;
  label: string;
  color: string;
  /** Rendered as a histogram (e.g. Awesome Oscillator) instead of a line. */
  histogram?: boolean;
}

export type IndicatorCategory = "overlay" | "oscillator";

export interface IndicatorParam {
  key: string;
  label: string;
  default: number;
}

export interface IndicatorDef {
  id: string;
  name: string;
  nameEn: string;
  category: IndicatorCategory;
  params: IndicatorParam[];
  lines: IndicatorLineSpec[];
  compute(points: HistoryPoint[], params: Record<string, number>): Record<string, IndicatorLinePoint[]>;
}

function toSeconds(p: HistoryPoint): number {
  return Math.floor(new Date(p.time).getTime() / 1000);
}

/** technicalindicators drops leading warm-up bars and returns a shorter
 * array with no time info — this re-attaches each output value to the
 * corresponding (tail-aligned) source bar's time. */
function alignTail(points: HistoryPoint[], values: number[]): IndicatorLinePoint[] {
  const offset = points.length - values.length;
  if (offset < 0) return [];
  return values.map((value, i) => ({ time: toSeconds(points[offset + i]), value }));
}

function alignTailField<T>(points: HistoryPoint[], rows: T[], field: keyof T): IndicatorLinePoint[] {
  const offset = points.length - rows.length;
  if (offset < 0) return [];
  const out: IndicatorLinePoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i][field] as unknown as number;
    if (v === undefined || v === null || !Number.isFinite(v)) continue;
    out.push({ time: toSeconds(points[offset + i]), value: v });
  }
  return out;
}

function closes(points: HistoryPoint[]): number[] {
  return points.map((p) => p.close);
}
function highs(points: HistoryPoint[]): number[] {
  return points.map((p) => p.high);
}
function lows(points: HistoryPoint[]): number[] {
  return points.map((p) => p.low);
}
function volumes(points: HistoryPoint[]): number[] {
  return points.map((p) => p.volume);
}

export const INDICATOR_CATALOG: IndicatorDef[] = [
  // ---------------------------------------------------------------- overlay
  {
    id: "sma",
    name: "Đường trung bình động (SMA)",
    nameEn: "Simple Moving Average",
    category: "overlay",
    params: [{ key: "period", label: "Chu kỳ", default: 20 }],
    lines: [{ key: "value", label: "SMA", color: "#f59e0b" }],
    compute: (points, p) => ({ value: alignTail(points, sma({ period: p.period, values: closes(points) })) }),
  },
  {
    id: "ema",
    name: "Đường trung bình động hàm mũ (EMA)",
    nameEn: "Exponential Moving Average",
    category: "overlay",
    params: [{ key: "period", label: "Chu kỳ", default: 20 }],
    lines: [{ key: "value", label: "EMA", color: "#8b5cf6" }],
    compute: (points, p) => ({ value: alignTail(points, ema({ period: p.period, values: closes(points) })) }),
  },
  {
    id: "wma",
    name: "Đường trung bình động trọng số (WMA)",
    nameEn: "Weighted Moving Average",
    category: "overlay",
    params: [{ key: "period", label: "Chu kỳ", default: 20 }],
    lines: [{ key: "value", label: "WMA", color: "#ec4899" }],
    compute: (points, p) => ({ value: alignTail(points, wma({ period: p.period, values: closes(points) })) }),
  },
  {
    id: "bb",
    name: "Dải Bollinger (Bollinger Bands)",
    nameEn: "Bollinger Bands",
    category: "overlay",
    params: [
      { key: "period", label: "Chu kỳ", default: 20 },
      { key: "stdDev", label: "Độ lệch chuẩn", default: 2 },
    ],
    lines: [
      { key: "upper", label: "BB Trên", color: "#38bdf8" },
      { key: "middle", label: "BB Giữa", color: "#94a3b8" },
      { key: "lower", label: "BB Dưới", color: "#38bdf8" },
    ],
    compute: (points, p) => {
      const rows = bollingerbands({ period: p.period, stdDev: p.stdDev, values: closes(points) });
      return {
        upper: alignTailField(points, rows, "upper"),
        middle: alignTailField(points, rows, "middle"),
        lower: alignTailField(points, rows, "lower"),
      };
    },
  },
  {
    id: "keltner",
    name: "Kênh Keltner (Keltner Channels)",
    nameEn: "Keltner Channels",
    category: "overlay",
    params: [
      { key: "maPeriod", label: "Chu kỳ MA", default: 20 },
      { key: "atrPeriod", label: "Chu kỳ ATR", default: 10 },
      { key: "multiplier", label: "Hệ số", default: 2 },
    ],
    lines: [
      { key: "upper", label: "Keltner Trên", color: "#2dd4bf" },
      { key: "middle", label: "Keltner Giữa", color: "#94a3b8" },
      { key: "lower", label: "Keltner Dưới", color: "#2dd4bf" },
    ],
    compute: (points, p) => {
      const rows = keltnerchannels({
        maPeriod: p.maPeriod,
        atrPeriod: p.atrPeriod,
        multiplier: p.multiplier,
        useSMA: false,
        high: highs(points),
        low: lows(points),
        close: closes(points),
      });
      return {
        upper: alignTailField(points, rows, "upper"),
        middle: alignTailField(points, rows, "middle"),
        lower: alignTailField(points, rows, "lower"),
      };
    },
  },
  {
    id: "vwap",
    name: "Giá trung bình theo khối lượng (VWAP)",
    nameEn: "Volume Weighted Average Price",
    category: "overlay",
    params: [],
    lines: [{ key: "value", label: "VWAP", color: "#d946ef" }],
    compute: (points) => ({
      value: alignTail(points, vwap({ high: highs(points), low: lows(points), close: closes(points), volume: volumes(points) })),
    }),
  },
  {
    id: "psar",
    name: "Parabolic SAR",
    nameEn: "Parabolic SAR",
    category: "overlay",
    params: [],
    lines: [{ key: "value", label: "PSAR", color: "#22d3ee" }],
    compute: (points) => ({
      value: alignTail(points, psar({ high: highs(points), low: lows(points), step: 0.02, max: 0.2 })),
    }),
  },
  {
    id: "ichimoku",
    name: "Mây Ichimoku (Ichimoku Cloud)",
    nameEn: "Ichimoku Cloud",
    category: "overlay",
    params: [],
    lines: [
      { key: "conversion", label: "Tenkan-sen", color: "#f87171" },
      { key: "base", label: "Kijun-sen", color: "#60a5fa" },
      { key: "spanA", label: "Senkou A", color: "#34d399" },
      { key: "spanB", label: "Senkou B", color: "#fb923c" },
    ],
    compute: (points) => {
      const rows = ichimokucloud({
        high: highs(points),
        low: lows(points),
        conversionPeriod: 9,
        basePeriod: 26,
        spanPeriod: 52,
        displacement: 26,
      });
      return {
        conversion: alignTailField(points, rows, "conversion"),
        base: alignTailField(points, rows, "base"),
        spanA: alignTailField(points, rows, "spanA"),
        spanB: alignTailField(points, rows, "spanB"),
      };
    },
  },
  {
    id: "avgprice",
    name: "Giá bình quân (O+H+L+C)/4",
    nameEn: "Average Price",
    category: "overlay",
    params: [],
    lines: [{ key: "value", label: "Avg Price", color: "#a3a3a3" }],
    compute: (points) => ({
      value: points.map((p) => ({ time: toSeconds(p), value: (p.open + p.high + p.low + p.close) / 4 })),
    }),
  },
  {
    id: "hilo52w",
    name: "Cao/Thấp 52 tuần (52 Week High/Low)",
    nameEn: "52 Week High/Low",
    category: "overlay",
    params: [{ key: "period", label: "Số phiên", default: 252 }],
    lines: [
      { key: "high", label: "Cao 52T", color: "#fb923c" },
      { key: "low", label: "Thấp 52T", color: "#60a5fa" },
    ],
    compute: (points, p) => {
      const period = p.period;
      const high: IndicatorLinePoint[] = [];
      const low: IndicatorLinePoint[] = [];
      for (let i = 0; i < points.length; i++) {
        const start = Math.max(0, i - period + 1);
        let hi = -Infinity;
        let lo = Infinity;
        for (let j = start; j <= i; j++) {
          hi = Math.max(hi, points[j].high);
          lo = Math.min(lo, points[j].low);
        }
        high.push({ time: toSeconds(points[i]), value: hi });
        low.push({ time: toSeconds(points[i]), value: lo });
      }
      return { high, low };
    },
  },

  // ------------------------------------------------------------- oscillator
  {
    id: "rsi",
    name: "Chỉ số sức mạnh tương đối (RSI)",
    nameEn: "Relative Strength Index",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 14 }],
    lines: [{ key: "value", label: "RSI", color: "#8b5cf6" }],
    compute: (points, p) => ({ value: alignTail(points, rsi({ period: p.period, values: closes(points) })) }),
  },
  {
    id: "macd",
    name: "MACD",
    nameEn: "Moving Average Convergence Divergence",
    category: "oscillator",
    params: [
      { key: "fastPeriod", label: "Nhanh", default: 12 },
      { key: "slowPeriod", label: "Chậm", default: 26 },
      { key: "signalPeriod", label: "Tín hiệu", default: 9 },
    ],
    lines: [
      { key: "MACD", label: "MACD", color: "#0ea5e9" },
      { key: "signal", label: "Signal", color: "#f97316" },
      { key: "histogram", label: "Hist", color: "#22c55e", histogram: true },
    ],
    compute: (points, p) => {
      const rows = macd({
        values: closes(points),
        fastPeriod: p.fastPeriod,
        slowPeriod: p.slowPeriod,
        signalPeriod: p.signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });
      return {
        MACD: alignTailField(points, rows, "MACD"),
        signal: alignTailField(points, rows, "signal"),
        histogram: alignTailField(points, rows, "histogram"),
      };
    },
  },
  {
    id: "stochastic",
    name: "Dao động Stochastic",
    nameEn: "Stochastic Oscillator",
    category: "oscillator",
    params: [
      { key: "period", label: "Chu kỳ %K", default: 14 },
      { key: "signalPeriod", label: "Chu kỳ %D", default: 3 },
    ],
    lines: [
      { key: "k", label: "%K", color: "#0ea5e9" },
      { key: "d", label: "%D", color: "#f97316" },
    ],
    compute: (points, p) => {
      const rows = stochastic({
        high: highs(points),
        low: lows(points),
        close: closes(points),
        period: p.period,
        signalPeriod: p.signalPeriod,
      });
      return { k: alignTailField(points, rows, "k"), d: alignTailField(points, rows, "d") };
    },
  },
  {
    id: "stochrsi",
    name: "Stochastic RSI",
    nameEn: "Stochastic RSI",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 14 }],
    lines: [
      { key: "k", label: "%K", color: "#0ea5e9" },
      { key: "d", label: "%D", color: "#f97316" },
    ],
    compute: (points, p) => {
      const rows = stochasticrsi({
        values: closes(points),
        rsiPeriod: p.period,
        stochasticPeriod: p.period,
        kPeriod: 3,
        dPeriod: 3,
      });
      return { k: alignTailField(points, rows, "k"), d: alignTailField(points, rows, "d") };
    },
  },
  {
    id: "williamsr",
    name: "Williams %R",
    nameEn: "Williams %R",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 14 }],
    lines: [{ key: "value", label: "%R", color: "#f472b6" }],
    compute: (points, p) => ({
      value: alignTail(points, williamsr({ high: highs(points), low: lows(points), close: closes(points), period: p.period })),
    }),
  },
  {
    id: "cci",
    name: "Chỉ số kênh hàng hóa (CCI)",
    nameEn: "Commodity Channel Index",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 20 }],
    lines: [{ key: "value", label: "CCI", color: "#facc15" }],
    compute: (points, p) => ({
      value: alignTail(points, cci({ high: highs(points), low: lows(points), close: closes(points), period: p.period })),
    }),
  },
  {
    id: "roc",
    name: "Tốc độ thay đổi (ROC)",
    nameEn: "Rate of Change",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 12 }],
    lines: [{ key: "value", label: "ROC", color: "#34d399" }],
    compute: (points, p) => ({ value: alignTail(points, roc({ period: p.period, values: closes(points) })) }),
  },
  {
    id: "trix",
    name: "TRIX",
    nameEn: "Triple Exponential Average",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 18 }],
    lines: [{ key: "value", label: "TRIX", color: "#a78bfa" }],
    compute: (points, p) => ({ value: alignTail(points, trix({ period: p.period, values: closes(points) })) }),
  },
  {
    id: "adx",
    name: "Chỉ số định hướng trung bình (ADX)",
    nameEn: "Average Directional Index",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 14 }],
    lines: [
      { key: "adx", label: "ADX", color: "#f59e0b" },
      { key: "pdi", label: "+DI", color: "#22c55e" },
      { key: "mdi", label: "-DI", color: "#ef4444" },
    ],
    compute: (points, p) => {
      const rows = adx({ high: highs(points), low: lows(points), close: closes(points), period: p.period });
      return {
        adx: alignTailField(points, rows, "adx"),
        pdi: alignTailField(points, rows, "pdi"),
        mdi: alignTailField(points, rows, "mdi"),
      };
    },
  },
  {
    id: "atr",
    name: "Khoảng dao động trung bình thực (ATR)",
    nameEn: "Average True Range",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 14 }],
    lines: [{ key: "value", label: "ATR", color: "#fb7185" }],
    compute: (points, p) => ({
      value: alignTail(points, atr({ high: highs(points), low: lows(points), close: closes(points), period: p.period })),
    }),
  },
  {
    id: "awesome",
    name: "Chỉ số Dao động Tuyệt vời (Awesome Oscillator)",
    nameEn: "Awesome Oscillator",
    category: "oscillator",
    params: [],
    lines: [{ key: "value", label: "AO", color: "#22c55e", histogram: true }],
    compute: (points) => ({
      value: alignTail(points, awesomeoscillator({ high: highs(points), low: lows(points), fastPeriod: 5, slowPeriod: 34 })),
    }),
  },
  {
    id: "adl",
    name: "Tích lũy / Phân phối (Accumulation/Distribution)",
    nameEn: "Accumulation/Distribution",
    category: "oscillator",
    params: [],
    lines: [{ key: "value", label: "A/D", color: "#38bdf8" }],
    compute: (points) => ({
      value: alignTail(points, adl({ high: highs(points), low: lows(points), close: closes(points), volume: volumes(points) })),
    }),
  },
  {
    id: "obv",
    name: "Khối lượng cân bằng (On Balance Volume)",
    nameEn: "On Balance Volume",
    category: "oscillator",
    params: [],
    lines: [{ key: "value", label: "OBV", color: "#c084fc" }],
    compute: (points) => ({ value: alignTail(points, obv({ close: closes(points), volume: volumes(points) })) }),
  },
  {
    id: "mfi",
    name: "Chỉ số dòng tiền (Money Flow Index)",
    nameEn: "Money Flow Index",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 14 }],
    lines: [{ key: "value", label: "MFI", color: "#fbbf24" }],
    compute: (points, p) => ({
      value: alignTail(
        points,
        mfi({ high: highs(points), low: lows(points), close: closes(points), volume: volumes(points), period: p.period })
      ),
    }),
  },
  {
    id: "forceindex",
    name: "Chỉ số sức mạnh (Force Index)",
    nameEn: "Force Index",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 13 }],
    lines: [{ key: "value", label: "Force Index", color: "#2dd4bf" }],
    compute: (points, p) => ({ value: alignTail(points, forceindex({ close: closes(points), volume: volumes(points), period: p.period })) }),
  },
  {
    id: "bop",
    name: "Cán cân sức mạnh thị trường (Balance of Power)",
    nameEn: "Balance of Power",
    category: "oscillator",
    params: [],
    lines: [{ key: "value", label: "BOP", color: "#e879f9" }],
    compute: (points) => ({
      value: points.map((p) => {
        const range = p.high - p.low;
        return { time: toSeconds(p), value: range === 0 ? 0 : (p.close - p.open) / range };
      }),
    }),
  },
  {
    id: "aroon",
    name: "Chỉ số Aroon",
    nameEn: "Aroon",
    category: "oscillator",
    params: [{ key: "period", label: "Chu kỳ", default: 25 }],
    lines: [
      { key: "up", label: "Aroon Up", color: "#22c55e" },
      { key: "down", label: "Aroon Down", color: "#ef4444" },
    ],
    compute: (points, p) => {
      const period = p.period;
      const up: IndicatorLinePoint[] = [];
      const down: IndicatorLinePoint[] = [];
      for (let i = period; i < points.length; i++) {
        const window = points.slice(i - period, i + 1);
        let hiIdx = 0;
        let loIdx = 0;
        for (let j = 1; j < window.length; j++) {
          if (window[j].high >= window[hiIdx].high) hiIdx = j;
          if (window[j].low <= window[loIdx].low) loIdx = j;
        }
        up.push({ time: toSeconds(points[i]), value: (hiIdx / period) * 100 });
        down.push({ time: toSeconds(points[i]), value: (loIdx / period) * 100 });
      }
      return { up, down };
    },
  },
];

export function findIndicatorDef(id: string): IndicatorDef | undefined {
  return INDICATOR_CATALOG.find((d) => d.id === id);
}

export function defaultParams(def: IndicatorDef): Record<string, number> {
  return Object.fromEntries(def.params.map((p) => [p.key, p.default]));
}
