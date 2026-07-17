import { Router, Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";
import { getProvider } from "../providers/index.js";
import { HistoryRange, TopExchange } from "../providers/types.js";
import { topTradedOf, VALID_EXCHANGES } from "../providers/topTraded.js";
import { fetchKbsReport, KbsPeriodType, KbsReportType } from "../providers/kbsFinancials.js";
import { fetchVnexpressNews } from "../news/vnexpressNews.js";

const router = Router();
const cache = new NodeCache({ stdTTL: 20, checkperiod: 30 });

const VALID_RANGES: HistoryRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"];
const VALID_REPORT_TYPES: KbsReportType[] = ["KQKD", "CDKT", "LCTT", "CSTC"];
const VALID_PERIOD_TYPES: KbsPeriodType[] = ["year", "quarter"];

function cached<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return Promise.resolve(hit);
  return loader().then((value) => {
    cache.set(key, value, ttl);
    return value;
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
    const provider = getProvider();
    const symbol = String(req.params.symbol).toUpperCase();
    const data = await cached(`quote:${symbol}`, 20, () => provider.getQuote(symbol));
    res.json(data);
  })
);

router.get(
  "/history/:symbol",
  asyncHandler(async (req, res) => {
    const provider = getProvider();
    const symbol = String(req.params.symbol).toUpperCase();
    const range = (req.query.range as HistoryRange) || "1M";
    if (!VALID_RANGES.includes(range)) {
      res.status(400).json({ error: `Invalid range. Use one of: ${VALID_RANGES.join(", ")}` });
      return;
    }
    const data = await cached(`history:${symbol}:${range}`, 120, () =>
      provider.getHistory(symbol, range)
    );
    res.json({ symbol, range, points: data });
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
      fetchKbsReport(symbol, reportType, periodType)
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
  "/news",
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const data = await cached(`news:${limit}`, 600, () => fetchVnexpressNews(limit));
    res.json({ items: data });
  })
);

export default router;
