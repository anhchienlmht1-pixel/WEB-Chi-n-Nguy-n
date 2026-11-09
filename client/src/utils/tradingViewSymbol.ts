// Maps this site's symbols to TradingView's "EXCHANGE:TICKER" form.
//
// Only Vietnamese listings are ever handed to the TradingView widget — the
// widget is embedded with symbol-change turned off, so the reader can't wander
// off to foreign markets; every symbol change goes through this site's own
// (Vietnam-only) search box and through this function.
//
// Checked on tradingview.com: HOSE:VNINDEX, HOSE:VN30, HNX:HNXINDEX,
// HOSE:HPG, HNX:PVS and UPCOM:ACV all resolve with live prices. UPCOMINDEX
// does not exist under either HNX: or UPCOM:, so it returns null and the
// caller falls back to the site's own chart.

const INDEX_SYMBOLS: Record<string, string> = {
  VNINDEX: "HOSE:VNINDEX",
  VN30: "HOSE:VN30",
  HNXINDEX: "HNX:HNXINDEX",
};

const EXCHANGE_PREFIX: Record<string, string> = {
  HOSE: "HOSE",
  HSX: "HOSE",
  HNX: "HNX",
  UPCOM: "UPCOM",
};

/** True when the symbol is one of the market indices this site tracks. */
export function isKnownIndex(symbol: string): boolean {
  return symbol.toUpperCase() in INDEX_SYMBOLS || symbol.toUpperCase() === "UPCOMINDEX";
}

/**
 * Returns the TradingView symbol, or null when TradingView has no matching
 * Vietnamese listing (index/futures it doesn't carry, or an unknown exchange).
 * `exchange` is the exchange label the API returns for a stock ("HOSE", "HNX",
 * "UPCOM"); it is ignored for indices, which are mapped by name.
 */
export function toTradingViewSymbol(symbol: string, exchange?: string | null): string | null {
  const code = symbol.trim().toUpperCase();
  if (!code) return null;
  if (isKnownIndex(code)) return INDEX_SYMBOLS[code] ?? null;
  const prefix = exchange ? EXCHANGE_PREFIX[exchange.trim().toUpperCase()] : undefined;
  return prefix ? `${prefix}:${code}` : null;
}
