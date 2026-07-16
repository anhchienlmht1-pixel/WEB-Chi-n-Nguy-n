import { STOCK_UNIVERSE } from "./universe.js";

// Used by real (non-mock) providers for the market-overview endpoint, since most
// free stock APIs don't expose a single "give me the whole market" call.
// Override with the WATCHLIST_SYMBOLS env var, e.g. "VNM,VCB,HPG,FPT".
// Defaults to the curated Vietnam universe so no foreign tickers appear.
export function getDefaultWatchlist(): string[] {
  const fromEnv = process.env.WATCHLIST_SYMBOLS;
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return STOCK_UNIVERSE.map((s) => s.symbol);
}
