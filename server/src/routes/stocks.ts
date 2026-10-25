import { Router, Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";
import { getProvider } from "../providers/index.js";
import { HistoryRange } from "../providers/types.js";
import { KbsPeriodType, KbsReportType } from "../providers/kbsFinancials.js";
import { fetchFinancialReport } from "../providers/financials.js";
import { getQuoteWithFallback, getHistoryWithFallback, getMarketOverviewWithFallback } from "../providers/fallback.js";
import { fetchInvestmentOutlook } from "../providers/googleSheet.js";
import { fetchNewsForSymbol } from "../news/cafefNews.js";
import { getCompanyProfileWithFallback } from "../providers/companyProfileFallback.js";
import { scanBuySignalsWithSession, type TrendScanResult } from "../signals/trendScanner.js";
import { isSettlingWindow, lastClosedSessionDate } from "../signals/sessionClose.js";
import { getTradeJournal } from "../signals/tradeJournal.js";
import { scanMovingAverages } from "../signals/maScanner.js";
import { fetchVndirectLogos, fetchVndirectCompanyProfilesRaw } from "../providers/vndirectLogos.js";
import { fetchDomainFavicons, debugFaviconForDomain } from "../providers/domainFavicons.js";
import { getCafefLogo, debugCafefLogo, isValidLogoSymbol } from "../providers/cafefLogos.js";
import { COMPANY_DOMAINS } from "../data/companyDomains.js";
import { buildFundInsight } from "../signals/fundInsight.js";
import inspectFmarketApi from "../providers/fmarketInspect.js";

const router = Router();
const cache = new NodeCache({ stdTTL: 20, checkperiod: 30 });

const VALID_RANGES: HistoryRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"];
const VALID_REPORT_TYPES: KbsReportType[] = ["KQKD", "CDKT", "LCTT", "CSTC"];
const VALID_PERIOD_TYPES: KbsPeriodType[] = ["year", "quarter"];

// Serves the last successfully fetched value instead of throwing when the
// live fetch fails — separate from the TTL cache above (which never keeps
// stale entries around). Only opted into by routes backed by Google
// Sheets' "Publish to web" CSV export, which isn't an SLA'd API and can
// have transient hiccups; for those (slow-changing, non-time-critical
// data), serving what we last read successfully beats surfacing a hard
// error on every request during a blip. Never used for price quotes/
// history, where silently serving a stale number would be misleading.
const lastGood = new Map<string, unknown>();

function cached<T>(
  key: string,
  ttl: number,
  loader: () => Promise<T>,
  opts?: { staleOnError?: boolean }
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return Promise.resolve(hit);
  return loader()
    .then((value) => {
      cache.set(key, value, ttl);
      if (opts?.staleOnError) lastGood.set(key, value);
      return value;
    })
    .catch((err) => {
      if (opts?.staleOnError && lastGood.has(key)) {
        console.error(
          `[cached] ${key} lỗi, dùng tạm dữ liệu lần tải thành công gần nhất: ${err instanceof Error ? err.message : String(err)}`
        );
        return lastGood.get(key) as T;
      }
      throw err;
    });
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
}

router.get(
  "/market/overview",
  asyncHandler(async (_req, res) => {
    const { quotes, source } = await cached("overview", 30, () => getMarketOverviewWithFallback());
    res.json({ provider: source, quotes });
  })
);

router.get(
  "/quote/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = String(req.params.symbol).toUpperCase();
    // A caller that already knows which source answered a related request
    // (e.g. the history chart for the same symbol) can pass it back here to
    // stay pinned to that source instead of independently re-resolving the
    // fallback chain, which could otherwise land on a different provider.
    const preferSource = (req.query.preferSource as string) || undefined;
    const { quote, source } = await cached(`quote:${symbol}:${preferSource ?? ""}`, 20, () =>
      getQuoteWithFallback(symbol, preferSource)
    );
    res.json({ ...quote, source });
  })
);

router.get(
  "/history/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = String(req.params.symbol).toUpperCase();
    const range = (req.query.range as HistoryRange) || "1M";
    if (!VALID_RANGES.includes(range)) {
      res.status(400).json({ error: `Invalid range. Use one of: ${VALID_RANGES.join(", ")}` });
      return;
    }
    const preferSource = (req.query.preferSource as string) || undefined;
    const { points, source } = await cached(`history:${symbol}:${range}:${preferSource ?? ""}`, 120, () =>
      getHistoryWithFallback(symbol, range, preferSource)
    );
    res.json({ symbol, range, points, source });
  })
);

router.get(
  "/financials/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = String(req.params.symbol).toUpperCase();
    const reportType = (req.query.type as KbsReportType) || "CSTC";
    const periodType = (req.query.periodType as KbsPeriodType) || "year";
    if (!VALID_REPORT_TYPES.includes(reportType)) {
      res.status(400).json({ error: `Invalid type. Use one of: ${VALID_REPORT_TYPES.join(", ")}` });
      return;
    }
    if (!VALID_PERIOD_TYPES.includes(periodType)) {
      res.status(400).json({ error: `Invalid periodType. Use one of: ${VALID_PERIOD_TYPES.join(", ")}` });
      return;
    }
    const data = await cached(`financials:${symbol}:${reportType}:${periodType}`, 3600, () =>
      fetchFinancialReport(symbol, reportType, periodType)
    );
    res.json(data);
  })
);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    const q = (req.query.q as string) || "";
    if (!q.trim()) {
      res.json({ results: [] });
      return;
    }
    const data = await cached(`search:${q.toLowerCase()}`, 30, () => provider.search(q));
    res.json({ results: data });
  })
);

router.get(
  "/news/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = String(req.params.symbol).toUpperCase();
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 10));
    const data = await cached(`news:${symbol}`, 600, () => fetchNewsForSymbol(symbol, limit));
    res.json({ symbol, ...data });
  })
);

router.get(
  "/investment-outlook",
  asyncHandler(async (req, res) => {
    const gid = req.query.gid as string | undefined;
    // 5 min TTL — long enough to not hammer Google Sheets on every page
    // view, short enough that an edit to the sheet shows up on the site
    // without a deploy.
    const data = await cached(`investment-outlook:${gid ?? "default"}`, 300, () => fetchInvestmentOutlook(gid), {
      staleOnError: true,
    });
    res.json(data);
  })
);

router.get(
  "/company-logos/debug/:symbol",
  asyncHandler(async (req, res) => {
    // Bypasses the 24h cache entirely — a live trace of exactly what
    // happened for one symbol (VNDirect's raw record, then each step of
    // the domain-favicon fallback), for diagnosing a "no logo" report
    // without needing live network access from wherever this is edited.
    // Not linked from the UI anywhere; safe to leave in.
    const symbol = String(req.params.symbol).toUpperCase();

    let vndirectRecord: unknown = null;
    let vndirectError: string | null = null;
    try {
      const rows = await fetchVndirectCompanyProfilesRaw();
      vndirectRecord =
        rows.find((r) => typeof r?.code === "string" && r.code.trim().toUpperCase() === symbol) ?? null;
    } catch (err) {
      vndirectError = err instanceof Error ? err.message : String(err);
    }

    const domain = COMPANY_DOMAINS[symbol] ?? null;
    const faviconTrace = domain ? await debugFaviconForDomain(domain) : null;
    const cafef = await debugCafefLogo(symbol);

    res.json({
      symbol,
      cafef,
      vndirect: { record: vndirectRecord, error: vndirectError },
      domain,
      faviconTrace,
    });
  })
);

// The company's own logo as published on CafeF (see providers/cafefLogos.ts) —
// the first choice for every logo on the site; the client only falls back to
// the VNDirect / favicon map below when this 404s. Served from our origin with
// a long cache lifetime because CafeF's CDN marks these files no-store.
router.get(
  "/company-logos/img/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = String(req.params.symbol).toUpperCase();
    const logo = isValidLogoSymbol(symbol) ? await getCafefLogo(symbol) : null;
    if (!logo) {
      // Short-lived so a symbol CafeF later gains a logo for isn't stuck on 404.
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600").status(404).end();
      return;
    }
    res.set({
      "Content-Type": logo.contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
    });
    res.send(logo.buffer);
  })
);

router.get(
  "/company-logos",
  asyncHandler(async (_req, res) => {
    // Logos change essentially never — a long TTL keeps this to one bulk
    // VNDirect fetch (~2800 companies) plus one favicon-verification pass
    // (~91 curated domains) a day, and a transient upstream failure just
    // serves yesterday's map (staleOnError) rather than breaking every
    // logo on the site.
    const data = await cached(
      "company-logos",
      24 * 60 * 60,
      async () => {
        const vndirect: Record<string, { logoUrl: string | null }> = await fetchVndirectLogos().catch((err) => {
          console.error(`[company-logos] VNDirect lỗi: ${err instanceof Error ? err.message : String(err)}`);
          return {};
        });

        // Only chase a favicon for symbols VNDirect gave us nothing for —
        // its bulk logo is preferred when available.
        const missingDomains = Object.fromEntries(
          Object.entries(COMPANY_DOMAINS).filter(([symbol]) => !vndirect[symbol]?.logoUrl)
        );
        const favicons: Record<string, string> = await fetchDomainFavicons(missingDomains).catch((err) => {
          console.error(`[company-logos] favicon fallback lỗi: ${err instanceof Error ? err.message : String(err)}`);
          return {};
        });

        const merged: Record<string, { logoUrl: string | null }> = { ...vndirect };
        for (const [symbol, url] of Object.entries(favicons)) {
          merged[symbol] = { logoUrl: url };
        }
        return merged;
      },
      { staleOnError: true }
    );
    res.json(data);
  })
);

router.get(
  "/company-profile/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = String(req.params.symbol).toUpperCase();
    // Company profile info (business model, CEO, address, leadership,
    // shareholders...) barely changes day to day, unlike price/financials
    // — a long 6h TTL avoids hammering KBS/VCI on every page view.
    const data = await cached(`company-profile:${symbol}`, 6 * 60 * 60, () => getCompanyProfileWithFallback(symbol));
    res.json(data);
  })
);

// "Chỉ kết luận khi đóng phiên": the buy list is computed from CLOSED daily
// bars only (see signals/sessionClose.ts), so it can change at most once per
// session — right after the 15:00 close. It's cached per closed session: the
// key rolls over at 15:00 and, until then, the previous session's conclusion
// keeps being served untouched. Just after the close the provider may still be
// settling the final bar, so that half hour is re-scanned every 5 minutes;
// afterwards a result is good for hours (15 minutes if the provider still has
// no bar for the closed session yet, e.g. a holiday or a lagging feed).
let lastTrendResult: TrendScanResult | null = null;
let trendInFlight: Promise<TrendScanResult> | null = null;

async function loadTrendSignals(): Promise<TrendScanResult> {
  const closed = lastClosedSessionDate();
  const key = `trend-signals:${closed}`;
  const hit = cache.get<TrendScanResult>(key);
  if (hit) return hit;
  if (trendInFlight) return trendInFlight;

  trendInFlight = (async () => {
    try {
      const result = await scanBuySignalsWithSession();
      lastTrendResult = result;
      const lagging = result.sessionDate < closed;
      const ttl = isSettlingWindow() ? 5 * 60 : lagging ? 15 * 60 : 6 * 60 * 60;
      cache.set(key, result, ttl);
      return result;
    } catch (err) {
      // Serve the previous conclusion rather than an error; deliberately not
      // cached, so the next request tries the scan again.
      if (lastTrendResult) {
        console.error(
          `[trend-signals] quét lỗi, dùng tạm kết luận phiên ${lastTrendResult.sessionDate}: ${err instanceof Error ? err.message : String(err)}`
        );
        return lastTrendResult;
      }
      throw err;
    } finally {
      trendInFlight = null;
    }
  })();
  return trendInFlight;
}

router.get(
  "/trend-signals",
  asyncHandler(async (_req, res) => {
    const { items, sessionDate } = await loadTrendSignals();
    res.json({ items, sessionDate });
  })
);

router.get(
  "/trend-signals/journal",
  asyncHandler(async (_req, res) => {
    // Real, forward-only trade log (see signals/tradeJournal.ts) — only
    // ever records what the Mua/Bán combo actually signals from
    // JOURNAL_START_DATE onward, not a backtest over historical prices.
    // A short TTL is fine: the journal itself only re-scans once a day.
    const data = await cached("trend-signals-journal", 5 * 60, () => getTradeJournal(), { staleOnError: true });
    res.json(data);
  })
);

router.get(
  "/ma-scan",
  asyncHandler(async (_req, res) => {
    // Same daily-bar computation across the whole stock universe as
    // trend-signals — every supported MA period (10/20/50/100/200) is
    // computed in one pass per symbol so the client can switch periods
    // without a fresh scan, cached for an hour since this only moves once
    // per trading day.
    const data = await cached("ma-scan", 60 * 60, () => scanMovingAverages(), { staleOnError: true });
    res.json({ items: data });
  })
);

router.get(
  "/fund-insight",
  asyncHandler(async (_req, res) => {
    // Aggregates the open funds' holdings from Fmarket and crosses them with
    // our own price strength. Fund holdings update at most daily and the
    // build fans out over ~40 fund detail calls plus a history scan, so a 1h
    // TTL with staleOnError keeps it cheap and resilient to a Fmarket blip.
    const data = await cached("fund-insight", 60 * 60, () => buildFundInsight(), { staleOnError: true });
    res.json(data);
  })
);

// Debug endpoint: inspect Fmarket API structure (test prospectus endpoints, holdings, etc.)
router.get(
  "/debug/fmarket-inspect",
  asyncHandler(async (_req, res) => {
    const report = await inspectFmarketApi();
    res.json(report);
  })
);

export default router;
