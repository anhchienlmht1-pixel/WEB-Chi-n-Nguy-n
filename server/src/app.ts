import express from "express";
import cors from "cors";
import stocksRouter from "./routes/stocks.js";
import { getProvider } from "./providers/index.js";

// Express app construction lives here, separate from index.ts's app.listen(),
// so the exact same app can be reused as Vercel's single serverless function
// (api/[...path].ts) — Vercel's Hobby plan caps a deployment at 12 functions,
// and this repo had grown to 13 one-file-per-route functions under api/,
// which broke every deployment. Routing everything through one Express app
// (as Vercel's own docs recommend for Express apps) collapses that to 1
// function and removes the ceiling entirely, instead of just trimming back
// under it.
export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", provider: getProvider().id });
});

app.use("/api", stocksRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});
