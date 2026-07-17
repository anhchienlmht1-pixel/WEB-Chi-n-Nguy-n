export interface IndexSeed {
  symbol: string;
  name: string;
  kind: "index" | "futures";
}

// Market indices — queried through the same symbol-based endpoints as
// stocks, kept in a separate list from STOCK_UNIVERSE so they don't leak
// into stock-only logic (default watchlist, HOSE/HNX/UPCOM top-traded
// ranking). Symbols verified against KB Securities' own index whitelist
// (vnstock/explorer/kbs/const.py _INDEX_MAPPING) since that's the provider
// actually used for quotes/history — note it's "UPCOMINDEX", not "UPINDEX".
//
// VN30 index futures (VN30F1M/F2M/F1Q/F2Q) are intentionally left out for
// now: KBS requires them converted to a rolling-maturity KRX code first
// (e.g. "41I1F7000", worked out from the current date), which needs real
// maturity-date business logic we haven't ported yet. Adding them with the
// old-style symbol would just silently 404 against KBS.
export const INDEX_UNIVERSE: IndexSeed[] = [
  { symbol: "VNINDEX", name: "Chỉ số VNINDEX", kind: "index" },
  { symbol: "HNXINDEX", name: "Chỉ số HNXINDEX", kind: "index" },
  { symbol: "UPCOMINDEX", name: "Chỉ số UPCOMINDEX", kind: "index" },
  { symbol: "VN30", name: "Chỉ số VN30", kind: "index" },
];

export function findIndexSeed(symbol: string): IndexSeed | undefined {
  return INDEX_UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
}
