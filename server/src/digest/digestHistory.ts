import { put, head } from "@vercel/blob";
import type { DailyDigest, DigestHeroStat, DigestTopic } from "./marketDigest.js";

// Durable archive for "Bài viết & Phân tích" — the route in stocks.ts only
// keeps *today's* digest in an in-memory cache (server/src/routes/
// stocks.ts's `cached()`), which is fine for serving the same article all
// day but doesn't survive a new calendar day, a server restart, or (on
// Vercel) a request simply landing on a different serverless instance —
// there's no shared memory between those. This module persists each day's
// finished article to Vercel Blob storage so past articles stay browsable
// instead of vanishing once the in-memory cache moves on to a new day.
//
// Requires the BLOB_READ_WRITE_TOKEN env var (set automatically once a
// Blob store is created and connected to the Vercel project — Vercel
// Dashboard → Storage → Create Database → Blob). Without it, every
// function here is a harmless no-op: saving is skipped (today's article
// still renders from the in-memory cache same as before) and history
// reads back empty instead of throwing.

const HISTORY_PREFIX = "digest-history/";
const INDEX_PATHNAME = `${HISTORY_PREFIX}index.json`;

export interface DigestHistoryEntry {
  date: string;
  topic: DigestTopic;
  topicLabel: string;
  title: string;
  heroStat: DigestHeroStat;
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function entryPathname(date: string): string {
  return `${HISTORY_PREFIX}${date}.json`;
}

async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Covers both "blob doesn't exist yet" (BlobNotFoundError — expected
    // the very first time this ever runs, before any digest has been
    // saved) and any transient Blob/network error — either way, callers
    // treat "no data" the same as "not saved yet".
    return null;
  }
}

async function writeJsonBlob(pathname: string, value: unknown): Promise<void> {
  await put(pathname, JSON.stringify(value), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function readIndex(): Promise<DigestHistoryEntry[]> {
  return (await readJsonBlob<DigestHistoryEntry[]>(INDEX_PATHNAME)) ?? [];
}

// Called once per day (right after a fresh digest is generated — see the
// /market/daily-digest route) — best-effort: a Blob failure here must
// never break today's article, so this only logs and moves on.
export async function saveDigestToHistory(digest: DailyDigest): Promise<void> {
  if (!blobConfigured()) return;
  try {
    await writeJsonBlob(entryPathname(digest.date), digest);
    const index = await readIndex();
    const next = [
      { date: digest.date, topic: digest.topic, topicLabel: digest.topicLabel, title: digest.title, heroStat: digest.heroStat },
      ...index.filter((e) => e.date !== digest.date),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
    await writeJsonBlob(INDEX_PATHNAME, next);
  } catch (err) {
    console.error(
      `[digest-history] Không lưu được bài ${digest.date} vào Vercel Blob: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// Lightweight list (date/title/topic/heroStat only) for the archive UI —
// doesn't fetch every day's full article.
export async function listDigestHistory(): Promise<DigestHistoryEntry[]> {
  if (!blobConfigured()) return [];
  return readIndex();
}

export async function getDigestFromHistory(date: string): Promise<DailyDigest | null> {
  if (!blobConfigured()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return readJsonBlob<DailyDigest>(entryPathname(date));
}

export function isDigestHistoryEnabled(): boolean {
  return blobConfigured();
}
