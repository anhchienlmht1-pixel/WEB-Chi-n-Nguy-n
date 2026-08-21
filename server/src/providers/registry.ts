/**
 * Provider Registry - Dynamic Provider Discovery & Management
 *
 * Architecture:
 * ┌─────────────────────────────────────────┐
 * │     Unified API Layer                   │
 * │  Market | Reference | Fundamental       │
 * ├─────────────────────────────────────────┤
 * │  Provider Registry (Dynamic Discovery)  │
 * ├─────────────────────────────────────────┤
 * │        Explorer (Web Scraping)          │
 * │  ┌──────────────────────────────────┐   │
 * │  │ VCI | KBS | MSN | FMarket        │   │
 * │  └──────────────────────────────────┘   │
 * │                                         │
 * │    Connector (Official APIs)            │
 * │  ┌──────────────────────────────────┐   │
 * │  │            FMP | DNSE            │   │
 * │  └──────────────────────────────────┘   │
 * └─────────────────────────────────────────┘
 */

import { StockProvider, HistoryRange, TopExchange, Quote, HistoryPoint, SearchResult, TopTradedItem } from "./types.js";

export type ProviderCategory = "explorer" | "connector";
export type DataSource = "vci" | "kbs" | "msn" | "fmarket" | "fmp" | "dnse" | "mock";

export interface ProviderMetadata {
  id: string;
  name: string;
  category: ProviderCategory;
  source: DataSource;
  priority: number; // Lower number = higher priority
  description: string;
  capabilities: {
    market: boolean;      // Real-time quotes, market data
    reference: boolean;   // Company info, fundamentals
    fundamentals: boolean; // Financial statements
    history: boolean;     // Historical OHLCV
    search: boolean;      // Symbol search
  };
  rateLimit?: {
    requestsPerMinute: number;
    burstSize?: number;
  };
  enabled: boolean;
}

export interface ProviderRegistry {
  metadata: ProviderMetadata;
  provider: StockProvider;
}

export interface ProviderChainResult<T> {
  data: T;
  source: string;
  metadata: ProviderMetadata;
}

/**
 * Global Provider Registry - Central management of all data providers
 */
export class ProviderRegistryManager {
  private providers: Map<string, ProviderRegistry> = new Map();
  private priorityOrder: string[] = [];
  private categoryProviders: Map<ProviderCategory, string[]> = new Map();
  private sourceProviders: Map<DataSource, string[]> = new Map();

  /**
   * Register a provider in the registry
   */
  register(metadata: ProviderMetadata, provider: StockProvider): void {
    this.providers.set(metadata.id, { metadata, provider });

    if (metadata.enabled) {
      // Add to priority order
      this.priorityOrder.push(metadata.id);
      this.priorityOrder.sort((a, b) => {
        const providerA = this.providers.get(a)!.metadata;
        const providerB = this.providers.get(b)!.metadata;
        return providerA.priority - providerB.priority;
      });

      // Add to category index
      const category = metadata.category;
      if (!this.categoryProviders.has(category)) {
        this.categoryProviders.set(category, []);
      }
      this.categoryProviders.get(category)!.push(metadata.id);

      // Add to source index
      const source = metadata.source;
      if (!this.sourceProviders.has(source)) {
        this.sourceProviders.set(source, []);
      }
      this.sourceProviders.get(source)!.push(metadata.id);
    }
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(id: string): ProviderRegistry | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all providers, optionally filtered by category or source
   */
  getAllProviders(
    category?: ProviderCategory,
    source?: DataSource
  ): ProviderRegistry[] {
    let ids: string[] = [];

    if (category && source) {
      const categoryIds = this.categoryProviders.get(category) || [];
      const sourceIds = this.sourceProviders.get(source) || [];
      ids = categoryIds.filter((id) => sourceIds.includes(id));
    } else if (category) {
      ids = this.categoryProviders.get(category) || [];
    } else if (source) {
      ids = this.sourceProviders.get(source) || [];
    } else {
      ids = this.priorityOrder;
    }

    return ids
      .map((id) => this.providers.get(id)!)
      .filter((p) => p.metadata.enabled);
  }

  /**
   * Get providers by category
   */
  getByCategory(category: ProviderCategory): ProviderRegistry[] {
    return this.getAllProviders(category);
  }

  /**
   * Get providers by source
   */
  getBySource(source: DataSource): ProviderRegistry[] {
    return this.getAllProviders(undefined, source);
  }

  /**
   * Get primary provider (highest priority)
   */
  getPrimary(): ProviderRegistry | undefined {
    if (this.priorityOrder.length === 0) return undefined;
    return this.providers.get(this.priorityOrder[0]);
  }

  /**
   * Get all enabled providers in priority order
   */
  getEnabledProviders(): ProviderRegistry[] {
    return this.priorityOrder.map((id) => this.providers.get(id)!);
  }

  /**
   * Set provider enabled/disabled
   */
  setEnabled(id: string, enabled: boolean): void {
    const registry = this.providers.get(id);
    if (registry) {
      registry.metadata.enabled = enabled;
      if (!enabled) {
        this.priorityOrder = this.priorityOrder.filter((pid) => pid !== id);
      } else if (!this.priorityOrder.includes(id)) {
        this.priorityOrder.push(id);
        this.priorityOrder.sort((a, b) => {
          const providerA = this.providers.get(a)!.metadata;
          const providerB = this.providers.get(b)!.metadata;
          return providerA.priority - providerB.priority;
        });
      }
    }
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const totalProviders = this.providers.size;
    const enabledProviders = this.priorityOrder.length;
    const categories = Array.from(this.categoryProviders.keys());
    const sources = Array.from(this.sourceProviders.keys());

    return {
      totalProviders,
      enabledProviders,
      categories,
      sources,
      providers: Array.from(this.providers.values()).map((r) => ({
        id: r.metadata.id,
        name: r.metadata.name,
        category: r.metadata.category,
        source: r.metadata.source,
        priority: r.metadata.priority,
        enabled: r.metadata.enabled,
      })),
    };
  }
}

/**
 * Provider Chain - Fallback mechanism for multiple providers
 * Tries providers in priority order until one succeeds
 */
export class ProviderChain {
  constructor(
    private registry: ProviderRegistryManager,
    private category?: ProviderCategory
  ) {}

  /**
   * Execute an operation with fallback
   */
  async execute<T>(
    operation: (provider: StockProvider, metadata: ProviderMetadata) => Promise<T>,
    errorHandler?: (error: Error, metadata: ProviderMetadata) => void
  ): Promise<ProviderChainResult<T>> {
    const providers = this.category
      ? this.registry.getByCategory(this.category)
      : this.registry.getEnabledProviders();

    let lastError: Error | null = null;

    for (const { metadata, provider } of providers) {
      try {
        const data = await operation(provider, metadata);
        return { data, source: metadata.id, metadata };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (errorHandler) {
          errorHandler(lastError, metadata);
        }
        // Continue to next provider
      }
    }

    throw (
      lastError || new Error("No providers available for the requested operation")
    );
  }

  /**
   * Get quote with fallback
   */
  async getQuote(symbol: string): Promise<ProviderChainResult<Quote>> {
    return this.execute((provider) => provider.getQuote(symbol));
  }

  /**
   * Get multiple quotes with fallback
   */
  async getQuotes(symbols: string[]): Promise<ProviderChainResult<Quote[]>> {
    return this.execute((provider) => provider.getQuotes(symbols));
  }

  /**
   * Get history with fallback
   */
  async getHistory(
    symbol: string,
    range: HistoryRange
  ): Promise<ProviderChainResult<HistoryPoint[]>> {
    return this.execute((provider) => provider.getHistory(symbol, range));
  }

  /**
   * Search with fallback
   */
  async search(query: string): Promise<ProviderChainResult<SearchResult[]>> {
    return this.execute((provider) => provider.search(query));
  }

  /**
   * Get market overview with fallback
   */
  async getMarketOverview(): Promise<ProviderChainResult<Quote[]>> {
    return this.execute((provider) => provider.getMarketOverview());
  }

  /**
   * Get top traded with fallback
   */
  async getTopTraded(
    exchange: TopExchange
  ): Promise<ProviderChainResult<TopTradedItem[]>> {
    return this.execute((provider) => {
      if (!provider.getTopTraded) {
        throw new Error("Provider does not support getTopTraded");
      }
      return provider.getTopTraded(exchange);
    });
  }
}

// Global instance
export const registryManager = new ProviderRegistryManager();

/**
 * Helper: Create a provider chain for market data
 */
export function createMarketChain(): ProviderChain {
  return new ProviderChain(registryManager, "explorer");
}

/**
 * Helper: Create a provider chain for reference data
 */
export function createReferenceChain(): ProviderChain {
  return new ProviderChain(registryManager, "connector");
}

/**
 * Helper: Create a fallback chain (all providers)
 */
export function createFallbackChain(): ProviderChain {
  return new ProviderChain(registryManager);
}
