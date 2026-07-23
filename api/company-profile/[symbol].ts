import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchKbsCompanyProfile } from "../../server/src/providers/kbsCompany.js";
import { cached } from "../_lib/cache.js";
import { sendError } from "../_lib/errors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const symbol = String(req.query.symbol ?? "").toUpperCase();
  try {
    const data = await cached(`company-profile:${symbol}`, 6 * 60 * 60, () => fetchKbsCompanyProfile(symbol));
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}
