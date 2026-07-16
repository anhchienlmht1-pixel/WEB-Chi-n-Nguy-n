import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProvider } from "../../server/src/providers/index.js";
import { cached } from "../_lib/cache.js";
import { sendError } from "../_lib/errors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const symbol = String(req.query.symbol ?? "").toUpperCase();
  try {
    const provider = getProvider();
    const data = await cached(`quote:${symbol}`, 15, () => provider.getQuote(symbol));
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}
