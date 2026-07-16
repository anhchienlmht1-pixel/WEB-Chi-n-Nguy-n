export interface StockSeed {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  basePrice: number;
}

// A representative universe covering VN and US markets so the demo feels real.
export const STOCK_UNIVERSE: StockSeed[] = [
  { symbol: "VNM", name: "Vinamilk", exchange: "HOSE", currency: "VND", basePrice: 67500 },
  { symbol: "VIC", name: "Vingroup", exchange: "HOSE", currency: "VND", basePrice: 45200 },
  { symbol: "VHM", name: "Vinhomes", exchange: "HOSE", currency: "VND", basePrice: 41800 },
  { symbol: "HPG", name: "Hoa Phat Group", exchange: "HOSE", currency: "VND", basePrice: 27300 },
  { symbol: "FPT", name: "FPT Corporation", exchange: "HOSE", currency: "VND", basePrice: 134500 },
  { symbol: "MWG", name: "Mobile World Investment", exchange: "HOSE", currency: "VND", basePrice: 62100 },
  { symbol: "VCB", name: "Vietcombank", exchange: "HOSE", currency: "VND", basePrice: 91200 },
  { symbol: "TCB", name: "Techcombank", exchange: "HOSE", currency: "VND", basePrice: 23800 },
  { symbol: "MSN", name: "Masan Group", exchange: "HOSE", currency: "VND", basePrice: 71600 },
  { symbol: "GAS", name: "PetroVietnam Gas", exchange: "HOSE", currency: "VND", basePrice: 68900 },
  { symbol: "SSI", name: "SSI Securities", exchange: "HOSE", currency: "VND", basePrice: 34200 },
  { symbol: "BID", name: "BIDV", exchange: "HOSE", currency: "VND", basePrice: 48700 },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", currency: "USD", basePrice: 227.5 },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", currency: "USD", basePrice: 421.3 },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", currency: "USD", basePrice: 176.8 },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", currency: "USD", basePrice: 186.4 },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", currency: "USD", basePrice: 248.9 },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", currency: "USD", basePrice: 135.2 },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", currency: "USD", basePrice: 563.7 },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ", currency: "USD", basePrice: 892.1 },
];

export function findSeed(symbol: string): StockSeed | undefined {
  return STOCK_UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
}
