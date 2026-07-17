import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchMacroIndicators } from "../server/src/macro/worldBank.js";
import { cached } from "./_lib/cache.js";
import { sendError } from "./_lib/errors.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await cached("macro", 6 * 3600, () => fetchMacroIndicators());
    res.status(200).json({ indicators: data });
  } catch (err) {
    sendError(res, err);
  }
}
