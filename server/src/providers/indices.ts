export interface IndexSeed {
  symbol: string;
  name: string;
  kind: "index" | "futures";
}

// Market indices and VN30 index-futures contracts — queried through the same
// symbol-based endpoints as stocks (Vietcap/VCI treats them as instruments
// too), kept in a separate list from STOCK_UNIVERSE so they don't leak into
// stock-only logic (default watchlist, HOSE/HNX/UPCOM top-traded ranking).
export const INDEX_UNIVERSE: IndexSeed[] = [
  { symbol: "VNINDEX", name: "Chỉ số VNINDEX", kind: "index" },
  { symbol: "HNXINDEX", name: "Chỉ số HNXINDEX", kind: "index" },
  { symbol: "UPINDEX", name: "Chỉ số UPINDEX", kind: "index" },
  { symbol: "VN30", name: "Chỉ số VN30", kind: "index" },
  { symbol: "VN30F1M", name: "Hợp đồng tương lai VN30F1M", kind: "futures" },
  { symbol: "VN30F2M", name: "Hợp đồng tương lai VN30F2M", kind: "futures" },
  { symbol: "VN30F1Q", name: "Hợp đồng tương lai VN30F1Q", kind: "futures" },
  { symbol: "VN30F2Q", name: "Hợp đồng tương lai VN30F2Q", kind: "futures" },
];

export function findIndexSeed(symbol: string): IndexSeed | undefined {
  return INDEX_UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
}
