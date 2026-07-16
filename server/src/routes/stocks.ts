import { Router, Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";
import { getProvider } from "../providers/index.js";
import { HistoryRange, TopExchange } from "../providers/types.js";
import { topTradedOf, VALID_EXCHANGES } from "../providers/topTraded.js";

const router = Router();
const cache = new NodeCache({ stdTTL: 20, checkperiod: 30 });

const VALID_RANGES: HistoryRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];

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

export default router;
