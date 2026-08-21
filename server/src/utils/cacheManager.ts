/**
 * Cache Manager với TTL (Time To Live) và Rate Limit Handling
 * Tránh vượt quá giới hạn API từ các provider
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

interface RateLimitInfo {
  lastRequestTime: number;
  consecutiveErrors: number;
  backoffMs: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private rateLimits = new Map<string, RateLimitInfo>();
  private readonly DEFAULT_TTL = 60 * 1000; // 60 seconds
  private readonly MAX_BACKOFF = 30 * 60 * 1000; // 30 minutes

  /**
   * Set cache với TTL
   */
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Get cache nếu còn hợp lệ (chưa hết TTL)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clear cache
   */
  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    Array.from(this.cache.keys())
      .filter((key) => key.includes(pattern))
      .forEach((key) => this.cache.delete(key));
  }

  /**
   * Kiểm tra và xử lý rate limit
   * Trả về thời gian cần đợi (ms) trước khi retry
   */
  async checkRateLimit(provider: string): Promise<number> {
    const key = `ratelimit:${provider}`;
    const info = this.rateLimits.get(key) || {
      lastRequestTime: 0,
      consecutiveErrors: 0,
      backoffMs: 1000,
    };

    const timeSinceLastRequest = Date.now() - info.lastRequestTime;
    const minInterval = info.backoffMs;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      return waitTime;
    }

    return 0;
  }

  /**
   * Ghi lại lỗi rate limit và tăng backoff time
   */
  recordRateLimitError(provider: string): void {
    const key = `ratelimit:${provider}`;
    const info = this.rateLimits.get(key) || {
      lastRequestTime: Date.now(),
      consecutiveErrors: 0,
      backoffMs: 1000,
    };

    info.consecutiveErrors++;
    info.lastRequestTime = Date.now();
    // Exponential backoff: 1s → 2s → 4s → 8s ... up to 30 minutes
    info.backoffMs = Math.min(info.backoffMs * 2, this.MAX_BACKOFF);

    this.rateLimits.set(key, info);
  }

  /**
   * Xóa rate limit counter khi thành công
   */
  recordSuccess(provider: string): void {
    const key = `ratelimit:${provider}`;
    this.rateLimits.set(key, {
      lastRequestTime: Date.now(),
      consecutiveErrors: 0,
      backoffMs: 1000, // Reset to minimum
    });
  }

  /**
   * Lấy thông tin hiện tại của rate limit
   */
  getRateLimitInfo(provider: string): RateLimitInfo | null {
    return this.rateLimits.get(`ratelimit:${provider}`) || null;
  }

  /**
   * Thống kê cache
   */
  getStats(): {
    cacheSize: number;
    activeLimits: number;
    entries: Array<{ key: string; ttl: number; age: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      ttl: entry.ttl,
      age: Date.now() - entry.timestamp,
    }));

    return {
      cacheSize: this.cache.size,
      activeLimits: this.rateLimits.size,
      entries,
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * Helper: Fetchdata với auto-retry và caching
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 60 * 1000,
  provider: string = "default"
): Promise<T> {
  // Kiểm tra cache trước
  const cached = cacheManager.get<T>(key);
  if (cached) {
    return cached;
  }

  // Kiểm tra rate limit
  const waitTime = await cacheManager.checkRateLimit(provider);
  if (waitTime > 0) {
    await new Promise((r) => setTimeout(r, waitTime));
  }

  try {
    const data = await fetcher();
    cacheManager.set(key, data, ttlMs);
    cacheManager.recordSuccess(provider);
    return data;
  } catch (error) {
    // Nếu là rate limit error (429 hoặc 503), record lại
    if (
      (error instanceof Error && error.message.includes("giới hạn")) ||
      (error as any).status === 429 ||
      (error as any).status === 503
    ) {
      cacheManager.recordRateLimitError(provider);
    }
    throw error;
  }
}
