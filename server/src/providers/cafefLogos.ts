// Company logos straight from CafeF — the same image CafeF itself shows on a
// company's page, never a generated or guessed one.
//
// How it works (verified in a real browser against cafef.vn, 2026-10-25): every
// company page cafef.vn/du-lieu/{sàn}/{mã}-tin-tuc.chn carries the company's own
// logo as its og:image, hosted at cafefnew.mediacdn.vn/LOGO/<file>. The file name
// is not predictable (FPT.jpg, VCB.png, HPG_20241111162735.jpg,
// Logo_VIC_20260813091745.jpg, ...) — which is why the page is read to find it
// instead of building the URL from the ticker. The {sàn} segment is ignored by
// CafeF (shs under /hose/ and vcb under /hnx/ both resolve), so one fixed value
// is used. All 197 tickers in this site's universe returned a logo, each file
// name containing its own ticker.
//
// The image is then served through our own /company-logos/img/:symbol route
// rather than hot-linked: CafeF's CDN sends "Cache-Control: no-store" on these
// files, so a hot-linked logo would be re-downloaded on every page view (HPG's
// is ~180 KB), while the proxy hands the browser/CDN a long cache lifetime.
//
// Only URLs matching LOGO_URL_RE are ever fetched, so a changed page layout (or
// a hostile og:image) can't turn this into a fetch-anything proxy.
import NodeCache from "node-cache";

const PAGE_BASE = "https://cafef.vn/du-lieu/hose";
const LOGO_URL_RE = /^https:\/\/cafefnew\.mediacdn\.vn\/LOGO\/[A-Za-z0-9._-]+\.(png|jpe?g|gif|webp)$/i;
const SYMBOL_RE = /^[A-Z0-9]{2,12}$/;
const MAX_IMAGE_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 8000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
};

const DAY_S = 24 * 60 * 60;
const URL_TTL_S = DAY_S; // a logo's file name only changes when CafeF swaps the logo
const URL_MISSING_TTL_S = 6 * 60 * 60; // CafeF has no logo / no such company page
const URL_ERROR_TTL_S = 5 * 60; // network blip — try again soon

export interface CafefLogo {
  buffer: Buffer;
  contentType: string;
}

// Value null = looked it up, nothing there. useClones: false so cached Buffers
// aren't deep-copied on every hit.
const urlCache = new NodeCache({ checkperiod: 600, maxKeys: 2000, useClones: false });
const imageCache = new NodeCache({ stdTTL: DAY_S, checkperiod: 600, maxKeys: 600, useClones: false });
const inflight = new Map<string, Promise<CafefLogo | null>>();

export function isValidLogoSymbol(symbol: string): boolean {
  return SYMBOL_RE.test(symbol);
}

/** Pulls the og:image URL out of a CafeF company page, whichever order the
 * meta tag's attributes come in. */
export function extractOgImage(html: string): string | null {
  const a = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  const b = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return (a?.[1] ?? b?.[1] ?? null)?.trim() ?? null;
}

interface LogoUrlLookup {
  logoUrl: string | null;
  // Set when the lookup itself failed (as opposed to "no logo exists"), so the
  // caller can cache the result for less time.
  error?: string;
  pageStatus?: number;
}

async function lookupLogoUrl(symbol: string): Promise<LogoUrlLookup> {
  const pageUrl = `${PAGE_BASE}/${symbol.toLowerCase()}-tin-tuc.chn`;
  try {
    const res = await fetch(pageUrl, {
      headers: { ...HEADERS, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 404) return { logoUrl: null, pageStatus: 404 };
    if (!res.ok) return { logoUrl: null, error: `CafeF trả mã ${res.status}`, pageStatus: res.status };
    const og = extractOgImage(await res.text());
    if (!og || !LOGO_URL_RE.test(og)) return { logoUrl: null, pageStatus: res.status };
    return { logoUrl: og, pageStatus: res.status };
  } catch (err) {
    return { logoUrl: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function resolveLogoUrl(symbol: string): Promise<string | null> {
  const cached = urlCache.get<string | null>(symbol);
  if (cached !== undefined) return cached;
  const found = await lookupLogoUrl(symbol);
  if (found.error) console.error(`[cafef-logo] ${symbol}: ${found.error}`);
  urlCache.set(symbol, found.logoUrl, found.logoUrl ? URL_TTL_S : found.error ? URL_ERROR_TTL_S : URL_MISSING_TTL_S);
  return found.logoUrl;
}

async function downloadLogo(url: string): Promise<CafefLogo | null> {
  try {
    // redirect: "manual" — the allow-listed host must be the one that answers.
    const res = await fetch(url, {
      headers: { ...HEADERS, Accept: "image/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status !== 200) return null;
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) return null;
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_IMAGE_BYTES) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
    return { buffer, contentType };
  } catch (err) {
    console.error(`[cafef-logo] tải ảnh lỗi (${url}): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** The company's own logo as CafeF publishes it, or null when CafeF has none
 * (or couldn't be reached). Never throws. Concurrent calls for one symbol share
 * a single upstream fetch. */
export function getCafefLogo(symbol: string): Promise<CafefLogo | null> {
  const key = symbol.toUpperCase();
  if (!SYMBOL_RE.test(key)) return Promise.resolve(null);

  const hit = imageCache.get<CafefLogo>(key);
  if (hit) return Promise.resolve(hit);

  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    const url = await resolveLogoUrl(key);
    if (!url) return null;
    const logo = await downloadLogo(url);
    if (logo) imageCache.set(key, logo);
    return logo;
  })().finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
}

/** Live trace for diagnosing a "no logo" report — bypasses every cache. */
export async function debugCafefLogo(symbol: string) {
  const key = symbol.toUpperCase();
  const pageUrl = `${PAGE_BASE}/${key.toLowerCase()}-tin-tuc.chn`;
  if (!SYMBOL_RE.test(key)) return { pageUrl, error: "Mã không hợp lệ" };
  const found = await lookupLogoUrl(key);
  const image = found.logoUrl ? await downloadLogo(found.logoUrl) : null;
  return {
    pageUrl,
    pageStatus: found.pageStatus ?? null,
    logoUrl: found.logoUrl,
    error: found.error ?? null,
    image: image ? { contentType: image.contentType, bytes: image.buffer.length } : null,
  };
}
