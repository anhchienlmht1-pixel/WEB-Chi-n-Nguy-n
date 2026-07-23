import { Router, Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";
import { getProvider } from "../providers/index.js";
import { HistoryRange, TopExchange } from "../providers/types.js";
import { topTradedOf, VALID_EXCHANGES } from "../providers/topTraded.js";
import { KbsPeriodType, KbsReportType } from "../providers/kbsFinancials.js";
import { fetchFinancialReport } from "../providers/financials.js";
import { getQuoteWithFallback, getHistoryWithFallback } from "../providers/fallback.js";
import {
  fetchInvestmentOutlook,
  fetchBankPbHistory,
  fetchSecuritiesPbHistory,
  fetchRealEstatePbHistory,
} from "../providers/googleSheet.js";
import { fetchNewsForSymbol } from "../news/cafefNews.js";
import { getCompanyProfileWithFallback } from "../providers/companyProfileFallback.js";

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
  "/market/top",
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    const exchange = String(req.query.exchange || "ALL").toUpperCase() as TopExchange;
    if (!VALID_EXCHANGES.includes(exchange)) {
      res.status(400).json({ error: `Sàn không hợp lệ. Dùng: ${VALID_EXCHANGES.join(", ")}` });
      return;
    }
    const data = await cached(`top:${exchange}`, 60, () => topTradedOf(provider, exchange));
    res.json({ provider: provider.id, exchange, items: data });
  })
);

router.get(
  "/market/overview",
  asyncHandler(async (_req, res) => {
    const provider = getProvider();
    const data = await cached("overview", 30, () => provider.getMarketOverview());
    res.json({ provider: provider.id, quotes: data });
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
  "/bank-pb-history",
  asyncHandler(async (_req, res) => {
    const data = await cached("bank-pb-history", 300, () => fetchBankPbHistory(), { staleOnError: true });
    res.json(data);
  })
);

router.get(
  "/securities-pb-history",
  asyncHandler(async (_req, res) => {
    const data = await cached("securities-pb-history", 300, () => fetchSecuritiesPbHistory(), {
      staleOnError: true,
    });
    res.json(data);
  })
);

router.get(
  "/realestate-pb-history",
  asyncHandler(async (_req, res) => {
    const data = await cached("realestate-pb-history", 300, () => fetchRealEstatePbHistory(), {
      staleOnError: true,
    });
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

export default router;
