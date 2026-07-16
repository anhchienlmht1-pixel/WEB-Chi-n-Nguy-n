import express from "express";
import cors from "cors";
import stocksRouter from "./routes/stocks.js";
import { getProvider } from "./providers/index.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

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

app.listen(PORT, () => {
  console.log(`Stock API server listening on http://localhost:${PORT} (provider: ${getProvider().id})`);
});
