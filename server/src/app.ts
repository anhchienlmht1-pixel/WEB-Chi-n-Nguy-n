import express from "express";
import cors from "cors";
import stocksRouter from "./routes/stocks.js";
import providersRouter from "./routes/providers.js";
import { getProvider, registryManager } from "./providers/index.js";

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

function health(_req: express.Request, res: express.Response) {
  res.json({
    status: "ok",
    provider: getProvider().id,
    registry: registryManager.getStats(),
  });
}

// Mounted at both "/api/..." (how the local dev server and the client's
// axios baseURL address it) and bare "/..." — Vercel's file-based catch-all
// convention (api/[...path].ts) isn't confirmed to preserve the "/api"
// prefix in req.url when it invokes the function (unlike an explicit
// vercel.json rewrite, which does), and there's no way to verify that
// against real Vercel infrastructure from this environment. Handling both
// shapes here removes the guesswork instead of betting the entire API on
// one assumption about platform behavior.
app.get("/api/health", health);
app.get("/health", health);
app.use("/api", stocksRouter);
app.use(stocksRouter);
app.use("/api/providers", providersRouter);
app.use("/providers", providersRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});
