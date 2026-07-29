// Fallback logo source: the company's own official domain's favicon,
// for symbols VNDirect's company_profiles API doesn't have a logo for.
// Fetches each domain's homepage HTML, looks for a <link rel="...icon...">
// tag (the usual way sites point at their real icon, often a proper square
// PNG rather than the bare favicon.ico), falling back to /favicon.ico if
// no such tag is found. Only returns a URL when the candidate actually
// resolved to an image (HTTP 200 + image/* content-type) — never guesses
// blind and hands back a URL that was never confirmed to load.
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 6000;

const HEADERS = {
  Accept: "text/html,image/*,*/*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, headers: HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

async function findIconLinkInHtml(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(baseUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;
    const html = await res.text();

    // Prefer larger/typed icons (apple-touch-icon, then icon with sizes) over a bare <link rel="icon">.
    const linkTags = Array.from(html.matchAll(/<link\b[^>]*>/gi)).map((m) => m[0]);
    const candidates = linkTags
      .map((tag) => {
        const relMatch = /rel=["']([^"']+)["']/i.exec(tag);
        const hrefMatch = /href=["']([^"']+)["']/i.exec(tag);
        const rel = relMatch?.[1]?.toLowerCase() ?? "";
        const href = hrefMatch?.[1];
        if (!href || !/icon/.test(rel)) return null;
        return { rel, href, priority: rel.includes("apple-touch-icon") ? 0 : rel === "icon" ? 1 : 2 };
      })
      .filter((c): c is { rel: string; href: string; priority: number } => c !== null)
      .sort((a, b) => a.priority - b.priority);

    for (const c of candidates) {
      const resolved = resolveUrl(c.href, baseUrl);
      if (resolved) return resolved;
    }
    return null;
  } catch {
    return null;
  }
}

async function verifyImage(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.startsWith("image/");
  } catch {
    return false;
  }
}

async function faviconForDomain(domain: string): Promise<string | null> {
  const homepage = `https://${domain}/`;
  const fromHtml = await findIconLinkInHtml(homepage);
  const fallback = `https://${domain}/favicon.ico`;
  const candidate = fromHtml ?? fallback;
  if (await verifyImage(candidate)) return candidate;
  if (candidate !== fallback && (await verifyImage(fallback))) return fallback;
  return null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** symbol -> verified favicon URL, only for symbols where a domain was given and a real image was confirmed. */
export async function fetchDomainFavicons(symbolDomains: Record<string, string>): Promise<Record<string, string>> {
  const entries = Object.entries(symbolDomains);
  const results = await mapWithConcurrency(entries, CONCURRENCY, async ([symbol, domain]) => ({
    symbol,
    url: await faviconForDomain(domain),
  }));

  const map: Record<string, string> = {};
  for (const r of results) {
    if (r.url) map[r.symbol] = r.url;
  }
  return map;
}
