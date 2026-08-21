# Provider Registry Architecture

## Overview

The Provider Registry is a comprehensive system for managing multiple data providers with automatic fallback, similar to the [vnstock](https://vnstock.site) library.

## Architecture

```
┌─────────────────────────────────────────┐
│     Unified API Layer                   │
│  Market | Reference | Fundamentals      │
├─────────────────────────────────────────┤
│  Provider Registry (Dynamic Discovery)  │
├─────────────────────────────────────────┤
│        Explorer (Web Scraping)          │
│  ┌──────────────────────────────────┐   │
│  │ VCI | KBS | Fireant | VNDirect   │   │
│  └──────────────────────────────────┘   │
│                                         │
│    Connector (Official APIs)            │
│  ┌──────────────────────────────────┐   │
│  │  FMP | TradingView | Yahoo | ... │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Components

### 1. Provider Registry (`server/src/providers/registry.ts`)

Central management system for all data providers.

#### Key Classes:

**ProviderRegistryManager**
- Registers and manages all providers
- Maintains priority ordering
- Supports filtering by category and source
- Provides statistics and introspection

**ProviderChain**
- Implements fallback mechanism
- Tries providers in priority order
- Automatic retry on failure
- Returns source information with results

#### Usage:

```typescript
import { registryManager, createMarketChain } from "./providers/registry";

// Get registry stats
const stats = registryManager.getStats();
console.log(stats.providers); // List all providers

// Get specific provider
const vci = registryManager.getProvider("vci");

// Get providers by category
const explorers = registryManager.getByCategory("explorer");

// Create a provider chain with fallback
const chain = createMarketChain();
const result = await chain.getQuote("FPT");
console.log(result.source); // Which provider answered
```

### 2. Provider Metadata (`server/src/providers/metadata.ts`)

Configuration and capabilities for each provider.

#### Available Providers:

**Explorer Providers** (Web Scraping - Priority 1-4):
| Provider | ID | Priority | Market | Reference | History | Search |
|----------|----|----|--------|-----------|---------|--------|
| Vietcap (VCI) | `vci` | 1 | ✅ | ❌ | ✅ | ✅ |
| KBS Vietnam | `kbs` | 2 | ✅ | ✅ | ✅ | ✅ |
| Fireant | `fireant` | 3 | ✅ | ✅ | ✅ | ✅ |
| VNDirect | `vndirect` | 4 | ✅ | ✅ | ✅ | ✅ |

**Connector Providers** (Official APIs - Priority 10+):
| Provider | ID | Priority | Status | Requires |
|----------|----|----|--------|----------|
| Financial Modeling Prep | `fmp` | 10 | Disabled | API Key |
| TradingView | `tradingview` | 11 | Disabled | API Restrictions |
| Yahoo Finance | `yahoo` | 12 | Disabled | None |
| Finnhub | `finnhub` | 13 | Disabled | API Key |
| Alpha Vantage | `alphavantage` | 14 | Disabled | API Key, Rate Limited |

#### Metadata Structure:

```typescript
interface ProviderMetadata {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  category: "explorer" | "connector";
  source: DataSource;            // Data source type
  priority: number;              // Lower = higher priority
  description: string;
  capabilities: {
    market: boolean;             // Real-time quotes
    reference: boolean;          // Company info
    fundamentals: boolean;       // Financial statements
    history: boolean;            // Historical data
    search: boolean;             // Symbol search
  };
  rateLimit?: {
    requestsPerMinute: number;
    burstSize?: number;
  };
  enabled: boolean;
}
```

### 3. Unified API Layer (`server/src/api/unified.ts`)

High-level data access APIs with automatic provider fallback.

#### Market API (Real-time Trading Data)

```typescript
import { Market } from "./api/unified";

// Get single quote
const quote = await Market.getQuote("FPT");
// Returns: { symbol, price, change, changePercent, volume, source, ... }

// Get multiple quotes
const quotes = await Market.getQuotes(["FPT", "VIC", "TCB"]);
// Returns: { quotes: [...], source: "vci" }

// Get market overview
const overview = await Market.getOverview();
// Uses environment variable WATCHLIST_SYMBOLS or all stocks

// Get top traded
const topTraded = await Market.getTopTraded("HOSE");
// Returns: { items: [...], exchange: "HOSE", source: "vci" }

// Get available market providers
const providers = Market.getAvailableProviders();
```

#### Reference API (Company Information)

```typescript
import { Reference } from "./api/unified";

// Search for symbols
const results = await Reference.search("Phat");
// Returns: { results: [{symbol, name, exchange}], source: "kbs" }
```

#### History API (Historical Price Data)

```typescript
import { History } from "./api/unified";

// Get historical data
const history = await History.getHistory("FPT", "1M");
// Returns: { symbol, range, points: [...], source: "vci" }
```

#### Provider Management API

```typescript
import { ProviderManagement } from "./api/unified";

// Get registry statistics
const stats = ProviderManagement.getStats();

// List all providers
const all = ProviderManagement.getAll();

// Get by category
const explorers = ProviderManagement.getByCategory("explorer");

// Enable/disable providers
ProviderManagement.setEnabled("alphavantage", true);
```

### 4. Provider Routes (`server/src/routes/providers.ts`)

REST endpoints for provider management.

#### Endpoints:

```
GET /api/providers/registry
Returns: { status, timestamp, registry: { totalProviders, enabledProviders, ... } }

GET /api/providers
Returns: { status, count, providers: [...] }

GET /api/providers/market
Returns: { status, category: "market", count, providers: [...] }

GET /api/providers/reference
Returns: { status, category: "reference", count, providers: [...] }

POST /api/providers/:id/enable
Returns: { status, action: "enable", providerId, registry }

POST /api/providers/:id/disable
Returns: { status, action: "disable", providerId, registry }
```

## Initialization

The registry is automatically initialized when the server starts:

```typescript
// server/src/index.ts
import { initializeRegistry } from "./providers/index.js";

initializeRegistry(); // Called at startup

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

This registers all providers with their metadata and sets up the provider chains.

## Usage Examples

### Getting Market Data with Automatic Fallback

```typescript
// Route handler using unified API
import { Market } from "../api/unified";

router.get("/market/quote/:symbol", async (req, res) => {
  try {
    const result = await Market.getQuote(req.params.symbol);
    res.json({
      quote: result,
      provider: result.source,
    });
  } catch (error) {
    // All providers failed
    res.status(503).json({ error: "All data providers unavailable" });
  }
});
```

### Checking Provider Status

```typescript
// Endpoint to show provider status
router.get("/status", async (req, res) => {
  const stats = ProviderManagement.getStats();
  const primary = Market.getPrimaryProvider();
  
  res.json({
    status: "ok",
    primaryProvider: primary,
    enabledProviders: stats.enabledProviders,
    totalProviders: stats.totalProviders,
    providers: ProviderManagement.getAll(),
  });
});
```

### Using Specific Provider Chain

```typescript
// Get data from market data providers only
const result = await Market.getMarketChain().getQuote("FPT");

// Get data from reference providers only  
const result = await Reference.getReferenceChain().search("bank");

// Use all providers with fallback
const result = FallbackAPI.getFallbackChain().getHistory("FPT", "1M");
```

## Adding New Providers

1. **Create provider implementation** (e.g., `src/providers/newProvider.ts`)

2. **Add metadata** in `src/providers/metadata.ts`:

```typescript
export const NEW_PROVIDER_METADATA: ProviderMetadata = {
  id: "newprovider",
  name: "New Provider Name",
  category: "explorer",
  source: "newsource",
  priority: 5,
  description: "Description of the provider",
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

export const ALL_METADATA: ProviderMetadata[] = [
  // ... existing ...
  NEW_PROVIDER_METADATA,
];
```

3. **Register in index.ts**:

```typescript
import { newProvider } from "./newProvider.js";

export function initializeRegistry(): void {
  registryManager.register(metadata.NEW_PROVIDER_METADATA, newProvider);
  // ... other registrations
}
```

## Rate Limiting

Each provider has configurable rate limiting:

```typescript
{
  rateLimit: {
    requestsPerMinute: 120,  // Requests per minute
    burstSize: 10,           // Allow burst up to this many
  }
}
```

Rate limit information is available via the metadata but is not yet enforced at runtime. The CacheManager system handles backoff strategy.

## Provider Capabilities Matrix

| Capability | Description | Explorer | Connector |
|-----------|-------------|----------|-----------|
| market | Real-time quotes, trading data | ✅ | ✅ |
| reference | Company info, metadata | ⚠️ (KBS, Fireant, VNDirect) | ✅ |
| fundamentals | Financial statements | ❌ | ✅ (FMP) |
| history | OHLCV historical data | ✅ | ✅ |
| search | Symbol search/autocomplete | ✅ | ⚠️ |

## Priority Ordering

Providers are tried in priority order (lower number = higher priority):

1. **VCI (Priority 1)** - Primary Vietnamese source
2. **KBS (Priority 2)** - Secondary Vietnamese source
3. **Fireant (Priority 3)** - Tertiary Vietnamese source
4. **VNDirect (Priority 4)** - Quaternary Vietnamese source
5-9. Reserved for future explorers
10+. Connector providers (official APIs)
100. Mock provider (testing only)

## Troubleshooting

### No providers available

```
Error: No providers available for the requested operation
```

Check that at least one provider is enabled:
```typescript
const stats = ProviderManagement.getStats();
console.log(stats.enabledProviders); // Should be > 0
```

### Provider not responding

The system automatically tries the next provider in the chain. Check the response source:
```typescript
const result = await Market.getQuote("FPT");
console.log(result.source); // Check which provider answered
```

### Rate limiting

If a provider returns 429 or 503, the system will:
1. Wait using exponential backoff (1s → 2s → 4s → ... → 30min)
2. Try the next provider
3. Increment the provider's error counter

View rate limit info via the providers endpoint:
```bash
GET /api/providers/:id
```

## Environment Variables

```bash
# Set default provider (legacy)
DATA_PROVIDER=kbs

# Enable specific connectors (requires API keys)
FMP_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
ALPHAVANTAGE_API_KEY=your_key_here
```

## Future Enhancements

- [ ] Rate limit enforcement and queuing
- [ ] Provider health monitoring and metrics
- [ ] Automatic provider switching based on performance
- [ ] Multi-source data aggregation (e.g., average prices)
- [ ] Provider-specific error recovery strategies
- [ ] Web UI for provider management
- [ ] Webhook notifications for provider status changes
- [ ] Provider-specific request signing/authentication
