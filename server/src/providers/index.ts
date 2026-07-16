import { StockProvider } from "./types.js";
import { mockProvider } from "./mockProvider.js";
import { fireantProvider } from "./fireantProvider.js";
import { vndirectProvider } from "./vndirectProvider.js";
import { yahooProvider } from "./yahooProvider.js";
import { alphaVantageProvider } from "./alphaVantageProvider.js";
import { finnhubProvider } from "./finnhubProvider.js";

const PROVIDERS: Record<string, StockProvider> = {
  mock: mockProvider,
  fireant: fireantProvider,
  vndirect: vndirectProvider,
  yahoo: yahooProvider,
  alphavantage: alphaVantageProvider,
  finnhub: finnhubProvider,
};

export function getProvider(): StockProvider {
  const id = (process.env.DATA_PROVIDER || "fireant").toLowerCase();
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new Error(
      `Unknown DATA_PROVIDER "${id}". Valid options: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return provider;
}

export type { StockProvider } from "./types.js";
