/**
 * Unified API Layer - High-level data access with automatic provider fallback
 *
 * Provides three main data categories:
 * 1. Market API - Real-time quotes and trading data
 * 2. Reference API - Company information and metadata
 * 3. Fundamentals API - Financial statements and analysis
 */

import { HistoryRange, TopExchange, Quote, HistoryPoint, SearchResult, TopTradedItem } from "../providers/types.js";
import { MarketAPI, ReferenceAPI, FallbackAPI, registryManager } from "../providers/index.js";

/**
 * Market API - Real-time trading data
 * Primary data source: Explorer providers (VCI, KBS, Fireant, VNDirect)
 * Fallback: Connector providers if explorers fail
 */
export const Market = {
  /**
   * Get real-time quote for a symbol
   * @param symbol Stock symbol (e.g., "FPT")
   * @returns Quote with current price, change, volume, etc.
   */
  async getQuote(symbol: string) {
    try {
      const result = await MarketAPI.getQuote(symbol);
      return {
        ...result.data,
        source: result.source,
      };
    } catch (error) {
      throw new Error(
        `Failed to get quote for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  /**
   * Get quotes for multiple symbols in one call
   * @param symbols Array of stock symbols
   * @returns Array of quotes
   */
  async getQuotes(symbols: string[]) {
    try {
      const result = await MarketAPI.getQuotes(symbols);
      return {
        quotes: result.data,
        source: result.source,
      };
    } catch (error) {
      throw new Error(
        `Failed to get quotes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  /**
   * Get market overview (watchlist or all symbols)
   * @returns Array of quotes for market overview
   */
  async getOverview() {
    try {
      const result = await MarketAPI.getMarketOverview();
      return {
        quotes: result.data,
        source: result.source,
      };
    } catch (error) {
      throw new Error(
        `Failed to get market overview: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  /**
   * Get top traded stocks for an exchange
   * @param exchange HOSE, HNX, UPCOM, or ALL
   * @returns Top 10 most traded items
   */
  async getTopTraded(exchange: TopExchange) {
    try {
      const result = await MarketAPI.getTopTraded(exchange);
      return {
        items: result.data,
        exchange,
        source: result.source,
      };
    } catch (error) {
      throw new Error(
        `Failed to get top traded for ${exchange}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  /**
   * Get the primary market data provider
   * @returns Provider information
   */
  getPrimaryProvider() {
    const primary = registryManager.getPrimary();
    if (!primary) return null;
    return {
      id: primary.metadata.id,
      name: primary.metadata.name,
      source: primary.metadata.source,
    };
  },

  /**
   * Get all available market data providers
   * @returns List of market providers
   */
  getAvailableProviders() {
    const providers = registryManager.getByCategory("explorer");
    return providers.map((p) => ({
      id: p.metadata.id,
      name: p.metadata.name,
      priority: p.metadata.priority,
      enabled: p.metadata.enabled,
    }));
  },
};

/**
 * Reference API - Company information and metadata
 * Data sources: All providers with category support
 */
export const Reference = {
  /**
   * Search for symbols by name or symbol
   * @param query Search string
   * @returns Array of matching search results
   */
  async search(query: string) {
    try {
      const result = await ReferenceAPI.search(query);
      return {
        results: result.data,
        source: result.source,
      };
    } catch (error) {
      throw new Error(
        `Failed to search: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },

  /**
   * Get company profile (to be implemented)
   * @param symbol Stock symbol
   * @returns Company profile information
   */
  async getCompanyProfile(symbol: string) {
    // This would call a dedicated provider method
    throw new Error("Not yet implemented in unified API");
  },
};

/**
 * History API - Historical price data with fallback
 * Data sources: All providers
 */
export const History = {
  /**
   * Get historical price data for a symbol
   * @param symbol Stock symbol
   * @param range Time range (1D, 1W, 1M, 3M, 6M, 1Y, 5Y, MAX)
   * @returns Array of historical price points
   */
  async getHistory(symbol: string, range: HistoryRange = "1M") {
    try {
      const result = await FallbackAPI.getHistory(symbol, range);
      return {
        symbol,
        range,
        points: result.data,
        source: result.source,
      };
    } catch (error) {
      throw new Error(
        `Failed to get history for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
};

/**
 * Provider Management API - Registry operations
 */
export const ProviderManagement = {
  /**
   * Get registry statistics
   * @returns Stats about registered providers
   */
  getStats() {
    return registryManager.getStats();
  },

  /**
   * Get all registered providers
   * @returns List of all providers with metadata
   */
  getAll() {
    const providers = registryManager.getEnabledProviders();
    return providers.map((p) => ({
      id: p.metadata.id,
      name: p.metadata.name,
      category: p.metadata.category,
      source: p.metadata.source,
      priority: p.metadata.priority,
      description: p.metadata.description,
      capabilities: p.metadata.capabilities,
      rateLimit: p.metadata.rateLimit,
      enabled: p.metadata.enabled,
    }));
  },

  /**
   * Get providers by category
   * @param category "explorer" or "connector"
   * @returns Filtered list of providers
   */
  getByCategory(category: "explorer" | "connector") {
    const providers = registryManager.getByCategory(category);
    return providers.map((p) => ({
      id: p.metadata.id,
      name: p.metadata.name,
      priority: p.metadata.priority,
      enabled: p.metadata.enabled,
    }));
  },

  /**
   * Enable/disable a provider
   * @param providerId Provider ID
   * @param enabled Whether to enable or disable
   */
  setEnabled(providerId: string, enabled: boolean) {
    registryManager.setEnabled(providerId, enabled);
    return registryManager.getStats();
  },
};
