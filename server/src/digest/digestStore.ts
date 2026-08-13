import { Redis } from "@upstash/redis";
import type { DailyDigest } from "./marketDigest.js";

// Durable persistence for daily digest articles ("Bản tin thị trường" /
// "history"). The rest of this app's caching (see routes/stocks.ts's
// `cached()`) is deliberately just an in-memory NodeCache — fine for
// prices/quotes that are re-fetchable at any time, but wrong for the daily
// digest: once a day's article is built, it should stay readable as
// "history" forever, and a plain in-memory cache loses everything on every
// serverless cold start / redeploy.
//
// Uses Upstash Redis (the storage Vercel's own "Redis" Marketplace
// integration provisions) when configured, and reads both the current
// (UPSTASH_REDIS_REST_URL/TOKEN) and legacy (KV_REST_API_URL/TOKEN, from
// the now-deprecated Vercel KV product) env var names so whichever
// integration set them just works. Falls back to an in-memory Map when
// neither is set, so local dev needs no setup — but that fallback keeps
// the exact same non-durable behavior this module exists to fix, so
// `isDigestStoreDurable` is exported for the API/UI to honestly disclose
// which mode is actually active instead of silently pretending.
const redis = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
})();

export const isDigestStoreDurable = redis !== null;

const KEY_PREFIX = "digest:";
const DATES_INDEX_KEY = "digest:dates";

// In-memory fallback, same shape/limits as the old NodeCache-based storage
// (per-process only, gone on restart) — only used when Redis isn't configured.
const memoryStore = new Map<string, DailyDigest>();

function dateScore(date: string): number {
  return Number(date.replaceAll("-", "")) || 0;
}

export async function saveDigest(date: string, digest: DailyDigest): Promise<void> {
  if (redis) {
    await Promise.all([
      redis.set(`${KEY_PREFIX}${date}`, digest),
      redis.zadd(DATES_INDEX_KEY, { score: dateScore(date), member: date }),
    ]);
    return;
  }
  memoryStore.set(date, digest);
}

export async function getDigest(date: string): Promise<DailyDigest | null> {
  if (redis) {
    const value = await redis.get<DailyDigest>(`${KEY_PREFIX}${date}`);
    return value ?? null;
  }
  return memoryStore.get(date) ?? null;
}

// Most recent dates first, capped at `limit` — a "browse history" list, not
// a full export, so no need to ever return more than a page's worth.
export async function listDigestDates(limit = 60): Promise<string[]> {
  if (redis) {
    const dates = await redis.zrange<string[]>(DATES_INDEX_KEY, 0, limit - 1, { rev: true });
    return dates;
  }
  return [...memoryStore.keys()].sort((a, b) => b.localeCompare(a)).slice(0, limit);
}
