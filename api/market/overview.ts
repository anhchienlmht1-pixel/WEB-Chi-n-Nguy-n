import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProvider } from "../../server/src/providers/index.js";
import { cached } from "../_lib/cache.js";
import { sendError } from "../_lib/errors.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const provider = getProvider();
    const data = await cached("overview", 30, () => provider.getMarketOverview());
    res.status(200).json({ provider: provider.id, quotes: data });
  } catch (err) {
    sendError(res, err);
  }
}
