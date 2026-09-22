import { sma, adx } from "technicalindicators";
import type { HistoryPoint } from "../types";
import { computeSupertrend } from "./signals";

export type SystemStatus = "buy" | "watch" | "avoid";

export interface SystemAssessment {
  status: SystemStatus;
  price: number;
  sma20: number;
  sma50: number;
  adx: number;
  supertrendDirection: 1 | -1;
  distanceFromSma20Pct: number;
  narrative: string;
  actionLine: string;
}

function fmt(v: number): string {
  return v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

// Same SMA20/SMA50/ADX(14)/Supertrend(10,3) combo as the chart's own
// Mua/Bán markers (see utils/signals.ts computeTradingSignals) and the
// server-side scanner — but read off just the LATEST bar to describe
// "where does this symbol stand right now" instead of a Mua/Bán event
// series. Every number in the narrative is a real, current indicator
// reading; nothing here is a backtested probability or win-rate claim,
// since none has been computed for this specific setup.
export function buildSystemAssessment(points: HistoryPoint[]): SystemAssessment | null {
  if (points.length < 51) return null;

  const closes = points.map((p) => p.close);
  const sma20Arr = sma({ period: 20, values: closes });
  const sma50Arr = sma({ period: 50, values: closes });
  const adxArr = adx({ high: points.map((p) => p.high), low: points.map((p) => p.low), close: closes, period: 14 });
  const supertrend = computeSupertrend(points, 10, 3);

  if (sma20Arr.length === 0 || sma50Arr.length === 0 || adxArr.length === 0 || supertrend.length === 0) return null;

  const sma20 = sma20Arr[sma20Arr.length - 1];
  const sma50 = sma50Arr[sma50Arr.length - 1];
  const adxVal = adxArr[adxArr.length - 1]?.adx;
  const direction = supertrend[supertrend.length - 1].direction;
  const price = closes[closes.length - 1];

  if (sma20 === undefined || sma50 === undefined || adxVal === undefined) return null;

  const distanceFromSma20Pct = ((price - sma20) / sma20) * 100;
  const isUptrendStructure = sma20 > sma50 && direction === 1;
  const isBuy = isUptrendStructure && adxVal > 25;

  const status: SystemStatus = isBuy ? "buy" : isUptrendStructure ? "watch" : "avoid";

  const narrative =
    [
      sma20 > sma50
        ? `SMA20 (${fmt(sma20)}) đang trên SMA50 (${fmt(sma50)})`
        : `SMA20 (${fmt(sma20)}) đang dưới SMA50 (${fmt(sma50)})`,
      adxVal > 25 ? `ADX(14) = ${adxVal.toFixed(1)}, xu hướng đủ mạnh (> 25)` : `ADX(14) = ${adxVal.toFixed(1)}, xu hướng chưa đủ mạnh (< 25)`,
      direction === 1 ? "Supertrend đang xác nhận tăng" : "Supertrend đang xác nhận giảm",
      `giá hiện cách MA20 ${distanceFromSma20Pct >= 0 ? "+" : ""}${distanceFromSma20Pct.toFixed(1)}%`,
    ].join(" · ") + ".";

  let actionLine: string;
  if (status === "buy") {
    actionLine =
      "Đủ 3 điều kiện Mua của hệ thống — có thể nắm giữ theo xu hướng, chỉ thoát khi SMA20 cắt xuống SMA50 hoặc Supertrend đảo chiều giảm.";
  } else if (status === "watch") {
    actionLine = `Cấu trúc tăng còn nguyên nhưng ADX chưa xác nhận đủ mạnh — hệ thống CHƯA phát tín hiệu Mua chính thức. Mốc quan sát rủi ro là MA20 (${fmt(sma20)}) — mất mốc này là dấu hiệu xu hướng suy yếu.`;
  } else {
    actionLine = "SMA20 dưới SMA50 hoặc Supertrend đang giảm — hệ thống chưa có cơ sở kỹ thuật để mua, nên đứng ngoài quan sát.";
  }

  return { status, price, sma20, sma50, adx: adxVal, supertrendDirection: direction, distanceFromSma20Pct, narrative, actionLine };
}
