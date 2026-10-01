import { StockProvider } from "./types.js";
import { mockProvider } from "./mockProvider.js";
import { vnstockProvider } from "./vnstockProvider.js";
import { kbsMarketProvider } from "./kbsMarketProvider.js";
import { tradingviewProvider } from "./tradingviewProvider.js";
import { fireantProvider } from "./fireantProvider.js";
import { vndirectProvider } from "./vndirectProvider.js";
import { yahooProvider } from "./yahooProvider.js";
import { alphaVantageProvider } from "./alphaVantageProvider.js";
import { finnhubProvider } from "./finnhubProvider.js";

const PROVIDERS: Record<string, StockProvider> = {
  mock: mockProvider,
  kbs: kbsMarketProvider,
  vnstock: vnstockProvider,
  tradingview: tradingviewProvider,
  fireant: fireantProvider,
  vndirect: vndirectProvider,
  yahoo: yahooProvider,
  alphavantage: alphaVantageProvider,
  finnhub: finnhubProvider,
};

export function getProvider(): StockProvider {
  // KBS is the current default of the upstream vnstock library's own
  // unified Market/Fundamental classes (verified against vnstock's GitHub
  // source) — matches what the financial-ratios feature already uses.
  const id = (process.env.DATA_PROVIDER || "kbs").toLowerCase();
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new Error(
      `Unknown DATA_PROVIDER "${id}". Valid options: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return provider;
}

export type { StockProvider } from "./types.js";
