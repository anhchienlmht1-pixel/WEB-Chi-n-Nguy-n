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

import {
  registryManager,
  createMarketChain,
  createReferenceChain,
  createFallbackChain,
  ProviderChain,
} from "./registry.js";
import * as metadata from "./metadata.js";

/**
 * Legacy provider map (for backward compatibility)
 */
const PROVIDERS: Record<string, StockProvider> = {
  mock: mockProvider,
  kbs: kbsMarketProvider,
  vnstock: vnstockProvider,
  vci: vnstockProvider, // VCI uses vnstock
  tradingview: tradingviewProvider,
  fireant: fireantProvider,
  vndirect: vndirectProvider,
  yahoo: yahooProvider,
  alphavantage: alphaVantageProvider,
  finnhub: finnhubProvider,
};

/**
 * Initialize provider registry with all available providers
 * This is called once at server startup
 */
export function initializeRegistry(): void {
  // Register explorer providers (web scraping)
  registryManager.register(metadata.VCI_METADATA, vnstockProvider);
  registryManager.register(metadata.KBS_METADATA, kbsMarketProvider);
  registryManager.register(metadata.FIREANT_METADATA, fireantProvider);
  registryManager.register(metadata.VNDIRECT_METADATA, vndirectProvider);

  // Register connector providers (official APIs)
  registryManager.register(metadata.FMP_METADATA, mockProvider); // Placeholder
  registryManager.register(metadata.TRADINGVIEW_METADATA, tradingviewProvider);
  registryManager.register(metadata.YAHOO_METADATA, yahooProvider);
  registryManager.register(metadata.FINNHUB_METADATA, finnhubProvider);
  registryManager.register(metadata.ALPHAVANTAGE_METADATA, alphaVantageProvider);

  // Register mock provider
  registryManager.register(metadata.MOCK_METADATA, mockProvider);

  console.log("[Registry] Provider registry initialized:", registryManager.getStats());
}

/**
 * Get a specific provider (legacy interface for backward compatibility)
 */
export function getProvider(): StockProvider {
  const primary = registryManager.getPrimary();
  if (!primary) {
    throw new Error("No providers available in registry");
  }
  // Support legacy DATA_PROVIDER environment variable
  const envProvider = process.env.DATA_PROVIDER?.toLowerCase();
  if (envProvider) {
    const provider = PROVIDERS[envProvider];
    if (provider) return provider;
    console.warn(`[Registry] Unknown DATA_PROVIDER "${envProvider}", using primary provider`);
  }
  return primary.provider;
}

/**
 * Get a provider by ID (new interface)
 */
export function getProviderById(id: string): StockProvider | undefined {
  const registry = registryManager.getProvider(id);
  return registry?.provider;
}

/**
 * Unified Market Data API - Real-time quotes, market overview
 * Uses explorer providers (web scraping)
 */
export const MarketAPI = {
  getMarketChain(): ProviderChain {
    return createMarketChain();
  },

  async getQuote(symbol: string) {
    const chain = this.getMarketChain();
    return chain.getQuote(symbol);
  },

  async getQuotes(symbols: string[]) {
    const chain = this.getMarketChain();
    return chain.getQuotes(symbols);
  },

  async getMarketOverview() {
    const chain = this.getMarketChain();
    return chain.getMarketOverview();
  },

  async getTopTraded(exchange: any) {
    const chain = this.getMarketChain();
    return chain.getTopTraded(exchange);
  },
};

/**
 * Unified Reference Data API - Company info, fundamentals
 * Uses all providers with fallback
 */
export const ReferenceAPI = {
  getReferenceChain(): ProviderChain {
    return createReferenceChain();
  },

  async search(query: string) {
    const chain = this.getReferenceChain();
    return chain.search(query);
  },
};

/**
 * Unified Fallback API - Uses all providers with priority fallback
 */
export const FallbackAPI = {
  getFallbackChain(): ProviderChain {
    return createFallbackChain();
  },

  async getHistory(symbol: string, range: any) {
    const chain = this.getFallbackChain();
    return chain.getHistory(symbol, range);
  },
};

// Re-export registry utilities
export { registryManager, createMarketChain, createReferenceChain, createFallbackChain };
export type { StockProvider } from "./types.js";
