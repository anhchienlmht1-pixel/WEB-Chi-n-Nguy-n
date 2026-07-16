import type { VercelResponse } from "@vercel/node";

export function sendError(res: VercelResponse, err: unknown): void {
  const status = (err as { status?: number })?.status ?? 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(status).json({ error: message });
}
