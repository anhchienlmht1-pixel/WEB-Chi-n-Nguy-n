import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProvider } from "../../server/src/providers/index.js";
import type { HistoryRange } from "../../server/src/providers/types.js";
import { cached } from "../_lib/cache.js";
import { sendError } from "../_lib/errors.js";

const VALID_RANGES: HistoryRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const symbol = String(req.query.symbol ?? "").toUpperCase();
  const range = (req.query.range as HistoryRange) || "1M";

  if (!VALID_RANGES.includes(range)) {
    res.status(400).json({ error: `Invalid range. Use one of: ${VALID_RANGES.join(", ")}` });
    return;
  }

  try {
    const provider = getProvider();
    const data = await cached(`history:${symbol}:${range}`, 120, () =>
      provider.getHistory(symbol, range)
    );
    res.status(200).json({ symbol, range, points: data });
  } catch (err) {
    sendError(res, err);
  }
}
