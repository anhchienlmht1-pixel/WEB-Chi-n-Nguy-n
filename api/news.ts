import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchVnexpressNews } from "../server/src/news/vnexpressNews.js";
import { cached } from "./_lib/cache.js";
import { sendError } from "./_lib/errors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  try {
    const data = await cached(`news:${limit}`, 600, () => fetchVnexpressNews(limit));
    res.status(200).json({ items: data });
  } catch (err) {
    sendError(res, err);
  }
}
