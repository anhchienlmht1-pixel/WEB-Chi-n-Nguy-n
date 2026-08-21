/**
 * Provider Metadata - Configuration for all data providers
 *
 * Defines capabilities, priorities, rate limits, and categories for each provider
 */

import { ProviderMetadata } from "./registry.js";

/**
 * Explorer Providers - Web scraping from public Vietnamese sources
 */

export const VCI_METADATA: ProviderMetadata = {
  id: "vci",
  name: "Vietcap (VCI)",
  category: "explorer",
  source: "vci",
  priority: 1, // Highest priority - most reliable Vietnamese source
  description: "VCI/Vietcap Securities trading API - Primary Vietnamese stock data",
  capabilities: {
    market: true,
    reference: false,
    fundamentals: false,
    history: true,
    search: true,
  },
  rateLimit: {
    requestsPerMinute: 120,
    burstSize: 10,
  },
  enabled: true,
};

export const KBS_METADATA: ProviderMetadata = {
  id: "kbs",
  name: "KBS Vietnam",
  category: "explorer",
  source: "kbs",
  priority: 2,
  description: "KBS Vietnam - Secondary Vietnamese stock data source",
  capabilities: {
    market: true,
    reference: true,
    fundamentals: false,
    history: true,
    search: true,
  },
  rateLimit: {
    requestsPerMinute: 100,
  },
  enabled: true,
};

export const FIREANT_METADATA: ProviderMetadata = {
  id: "fireant",
  name: "Fireant",
  category: "explorer",
  source: "fmarket",
  priority: 3,
  description: "Fireant - Vietnamese stock analysis platform",
  capabilities: {
    market: true,
    reference: true,
    fundamentals: false,
    history: true,
    search: true,
  },
  rateLimit: {
    requestsPerMinute: 60,
  },
  enabled: true,
};

export const VNDIRECT_METADATA: ProviderMetadata = {
  id: "vndirect",
  name: "VNDirect",
  category: "explorer",
  source: "fmarket",
  priority: 4,
  description: "VNDirect Securities - Vietnamese broker data",
  capabilities: {
    market: true,
    reference: true,
    fundamentals: false,
    history: true,
    search: true,
  },
  rateLimit: {
    requestsPerMinute: 80,
  },
  enabled: true,
};

/**
 * Connector Providers - Official APIs (Global)
 */

export const FMP_METADATA: ProviderMetadata = {
  id: "fmp",
  name: "Financial Modeling Prep",
  category: "connector",
  source: "fmp",
  priority: 10,
  description: "FMP - Global financial data API (requires API key)",
  capabilities: {
    market: true,
    reference: true,
    fundamentals: true,
    history: true,
    search: true,
  },
  rateLimit: {
    requestsPerMinute: 300,
  },
  enabled: false, // Requires API key
};

export const TRADINGVIEW_METADATA: ProviderMetadata = {
  id: "tradingview",
  name: "TradingView",
  category: "connector",
  source: "msn",
  priority: 11,
  description: "TradingView - Global market data and charts",
  capabilities: {
    market: true,
    reference: false,
    fundamentals: false,
    history: true,
    search: true,
  },
  rateLimit: {
    requestsPerMinute: 200,
  },
  enabled: false, // API restrictions
};

export const YAHOO_METADATA: ProviderMetadata = {
  id: "yahoo",
  name: "Yahoo Finance",
  category: "connector",
  source: "fmarket",
  priority: 12,
  description: "Yahoo Finance - Global stock and fund data",
  capabilities: {
    market: true,
    reference: false,
    fundamentals: false,
    history: true,
    search: true,
  },
  rateLimit: {
    requestsPerMinute: 150,
  },
  enabled: false,
};

export const FINNHUB_METADATA: ProviderMetadata = {
  id: "finnhub",
  name: "Finnhub",
  category: "connector",
  source: "fmp",
  priority: 13,
  description: "Finnhub - Stock market data and news (requires API key)",
  capabilities: {
    market: true,
    reference: true,
    fundamentals: false,
    history: true,
    search: true,
  },
  rateLimit: {
    requestsPerMinute: 60,
  },
  enabled: false, // Requires API key
};

export const ALPHAVANTAGE_METADATA: ProviderMetadata = {
  id: "alphavantage",
  name: "Alpha Vantage",
  category: "connector",
  source: "fmp",
  priority: 14,
  description: "Alpha Vantage - Equity and forex data (requires API key)",
  capabilities: {
    market: true,
    reference: false,
    fundamentals: false,
    history: true,
    search: false,
  },
  rateLimit: {
    requestsPerMinute: 5, // Very restrictive
  },
  enabled: false, // Requires API key, rate limited
};

/**
 * Mock Provider - For testing and development
 */
export const MOCK_METADATA: ProviderMetadata = {
  id: "mock",
  name: "Mock Provider",
  category: "explorer",
  source: "vci",
  priority: 100, // Lowest priority
  description: "Mock data provider for testing and development",
  capabilities: {
    market: true,
    reference: true,
    fundamentals: false,
    history: true,
    search: true,
  },
  enabled: false,
};

/**
 * All metadata exports for easy access
 */
export const ALL_METADATA: ProviderMetadata[] = [
  // Explorer (web scraping - priority 1-4)
  VCI_METADATA,
  KBS_METADATA,
  FIREANT_METADATA,
  VNDIRECT_METADATA,
  // Connector (official APIs - priority 10+)
  FMP_METADATA,
  TRADINGVIEW_METADATA,
  YAHOO_METADATA,
  FINNHUB_METADATA,
  ALPHAVANTAGE_METADATA,
  // Testing
  MOCK_METADATA,
];

/**
 * Get metadata by provider ID
 */
export function getMetadata(id: string): ProviderMetadata | undefined {
  return ALL_METADATA.find((m) => m.id === id);
}

/**
 * Get all enabled metadata
 */
export function getEnabledMetadata(): ProviderMetadata[] {
  return ALL_METADATA.filter((m) => m.enabled);
}

/**
 * Get metadata by category
 */
export function getMetadataByCategory(
  category: "explorer" | "connector"
): ProviderMetadata[] {
  return ALL_METADATA.filter((m) => m.category === category && m.enabled);
}
