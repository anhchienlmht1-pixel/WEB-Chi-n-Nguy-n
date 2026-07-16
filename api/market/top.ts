import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProvider } from "../../server/src/providers/index.js";
import type { TopExchange } from "../../server/src/providers/types.js";
import { topTradedOf, VALID_EXCHANGES } from "../../server/src/providers/topTraded.js";
import { cached } from "../_lib/cache.js";
import { sendError } from "../_lib/errors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const exchange = String(req.query.exchange ?? "ALL").toUpperCase() as TopExchange;
  if (!VALID_EXCHANGES.includes(exchange)) {
    res.status(400).json({ error: `Sàn không hợp lệ. Dùng: ${VALID_EXCHANGES.join(", ")}` });
    return;
  }
  try {
    const provider = getProvider();
    const data = await cached(`top:${exchange}`, 30, () => topTradedOf(provider, exchange));
    res.status(200).json({ provider: provider.id, exchange, items: data });
  } catch (err) {
    sendError(res, err);
  }
}
