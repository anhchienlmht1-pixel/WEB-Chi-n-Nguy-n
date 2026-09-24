import { Router, Request, Response, NextFunction } from "express";
import { runScanBatch } from "../signals/backgroundScan.js";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
}

// Vercel Cron (see vercel.json's "crons") hits this on a schedule; when the
// CRON_SECRET env var is set, Vercel automatically sends it as a Bearer
// token — checked here too so the endpoint doesn't just trust the network
// path. Without CRON_SECRET set, the check is skipped (local/dev use).
function requireCronSecret(req: Request, res: Response): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  if (req.headers.authorization === `Bearer ${secret}`) return true;
  res.status(401).json({ error: "unauthorized" });
  return false;
}

router.get(
  "/cron/scan-trend-signals",
  asyncHandler(async (req, res) => {
    if (!requireCronSecret(req, res)) return;
    const result = await runScanBatch();
    res.json(result);
  })
);

export default router;
