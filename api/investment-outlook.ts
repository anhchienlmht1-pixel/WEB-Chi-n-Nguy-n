import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchInvestmentOutlook } from "../server/src/providers/googleSheet.js";
import { cached } from "./_lib/cache.js";
import { sendError } from "./_lib/errors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const gid = req.query.gid as string | undefined;
    const data = await cached(`investment-outlook:${gid ?? "default"}`, 300, () => fetchInvestmentOutlook(gid));
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
}
