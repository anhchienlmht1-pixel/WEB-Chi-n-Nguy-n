import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchNewsForSymbol } from "../../server/src/news/cafefNews.js";
import { cached } from "../_lib/cache.js";
import { sendError } from "../_lib/errors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const symbol = String(req.query.symbol ?? "").toUpperCase();
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 10));
  try {
    const data = await cached(`news:${symbol}`, 600, () => fetchNewsForSymbol(symbol, limit));
    res.status(200).json({ symbol, items: data });
  } catch (err) {
    sendError(res, err);
  }
}
