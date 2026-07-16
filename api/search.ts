import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProvider } from "../server/src/providers/index.js";
import { cached } from "./_lib/cache.js";
import { sendError } from "./_lib/errors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = String(req.query.q ?? "");
  if (!q.trim()) {
    res.status(200).json({ results: [] });
    return;
  }
  try {
    const provider = getProvider();
    const data = await cached(`search:${q.toLowerCase()}`, 30, () => provider.search(q));
    res.status(200).json({ results: data });
  } catch (err) {
    sendError(res, err);
  }
}
