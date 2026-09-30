import type { Quote } from "../types";
import { formatVolume } from "./format";

export interface ForeignFlowRow {
  quote: Quote;
  netVolume: number;
  netValue: number;
}

// KBS's price board only carries foreign buy/sell VOLUME (shares), not a
// separate value field — netValue here is volume × current price, an
// estimate (each foreign trade may have matched at a different price during
// the session), not the exchange's own reported turnover value. Only
// today's session snapshot is available (no historical daily foreign-flow
// endpoint), so this reflects the current trading day.
export function computeForeignFlowRows(quotes: Quote[]): ForeignFlowRow[] {
  return quotes
    .filter((q) => q.exchange !== "Chỉ số" && q.exchange !== "Phái sinh")
    .filter((q) => q.foreignBuyVolume != null && q.foreignSellVolume != null)
    .map((q) => {
      const netVolume = (q.foreignBuyVolume ?? 0) - (q.foreignSellVolume ?? 0);
      return { quote: q, netVolume, netValue: netVolume * q.price };
    });
}

export function formatNetVolume(volume: number): string {
  const sign = volume > 0 ? "+" : volume < 0 ? "−" : "";
  return `${sign}${formatVolume(Math.abs(volume))}`;
}

export function formatNetValue(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  const billions = abs / 1_000_000_000;
  const text =
    billions >= 1
      ? `${billions.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`
      : `${(abs / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} triệu`;
  return `${sign}${text}`;
}
