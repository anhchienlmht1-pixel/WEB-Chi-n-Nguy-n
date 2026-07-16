import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProvider } from "../server/src/providers/index.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ status: "ok", provider: getProvider().id });
}
