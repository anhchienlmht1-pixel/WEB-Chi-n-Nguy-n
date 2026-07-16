// Used by real (non-mock) providers for the market-overview endpoint, since most
// free stock APIs don't expose a single "give me the whole market" call.
// Override with the WATCHLIST_SYMBOLS env var, e.g. "AAPL,MSFT,GOOGL,VNM.VN".
export function getDefaultWatchlist(): string[] {
  const fromEnv = process.env.WATCHLIST_SYMBOLS;
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"];
}
