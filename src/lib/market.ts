import { Exchange } from "./types";

// Daily trading band (biên độ dao động) per exchange, per current HOSE/HNX/UPCOM rules.
const BAND: Record<Exchange, number> = {
  HOSE: 0.07,
  HNX: 0.1,
  UPCOM: 0.15,
};

/** Round to the exchange tick convention (nearest 0.01, i.e. 10 VND). */
function roundTick(value: number): number {
  return Math.round(value * 100) / 100;
}

export function ceilingPrice(refPrice: number, exchange: Exchange): number {
  return roundTick(refPrice * (1 + BAND[exchange]));
}

export function floorPrice(refPrice: number, exchange: Exchange): number {
  return roundTick(refPrice * (1 - BAND[exchange]));
}

export type PriceState = "ceiling" | "floor" | "up" | "down" | "ref";

export function priceState(
  price: number,
  refPrice: number,
  ceiling: number,
  floor: number
): PriceState {
  if (price >= ceiling && ceiling > 0) return "ceiling";
  if (price <= floor && floor > 0) return "floor";
  if (price > refPrice) return "up";
  if (price < refPrice) return "down";
  return "ref";
}

// Vietnamese market convention: red = up (tăng), green = down (giảm),
// yellow = unchanged (tham chiếu), magenta = ceiling (trần), cyan = floor (sàn).
export const PRICE_COLOR: Record<PriceState, string> = {
  ceiling: "text-fuchsia-500",
  floor: "text-sky-400",
  up: "text-rose-500",
  down: "text-emerald-500",
  ref: "text-amber-400",
};

export const PRICE_BG: Record<PriceState, string> = {
  ceiling: "bg-fuchsia-500/10",
  floor: "bg-sky-400/10",
  up: "bg-rose-500/5",
  down: "bg-emerald-500/5",
  ref: "bg-amber-400/5",
};
