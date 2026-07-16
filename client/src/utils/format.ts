export function formatPrice(price: number, currency: string): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN").format(Math.round(price));
  }
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    price
  );
}

export function formatChange(change: number, currency: string): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${formatPrice(change, currency)}`;
}

export function formatPercent(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return String(volume);
}

export function formatMarketCap(cap: number | undefined, currency: string): string {
  if (!cap) return "—";
  const unit = currency === "VND" ? 1_000_000_000_000 : 1_000_000_000;
  const label = currency === "VND" ? "nghìn tỷ" : "B";
  return `${(cap / unit).toFixed(2)} ${label}`;
}

export function trendClass(value: number): string {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}
