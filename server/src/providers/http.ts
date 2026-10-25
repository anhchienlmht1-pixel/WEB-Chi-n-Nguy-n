// Shared fetch wrapper for the quote/history data sources.
//
// Node's fetch has no default timeout, so a source that accepts the
// connection but never answers used to hang the whole request until the
// serverless function hit its own 30s limit — and because the fallback chain
// is sequential, the *next* provider never even got a chance to run. Every
// upstream call now has a hard deadline (it also covers reading the body).
export const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS) || 8000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = UPSTREAM_TIMEOUT_MS
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw Object.assign(new Error(`Hết thời gian chờ ${timeoutMs}ms: ${url}`), { status: 504 });
    }
    throw err;
  }
}
