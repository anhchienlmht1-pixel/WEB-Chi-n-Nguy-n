import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchSecuritiesPbHistory } from "../server/src/providers/googleSheet.js";
import { cached } from "./_lib/cache.js";
import { sendError } from "./_lib/errors.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await cached("securities-pb-history", 300, () => fetchSecuritiesPbHistory());
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}
