import { app } from "../server/src/app.js";

// The single function for every /api/* route, wrapping the same Express
// app the local dev server runs. Reached via an explicit vercel.json
// "rewrites" rule (source: "/api/:path*" -> destination: "/api/index")
// rather than the [...path].ts catch-all filename convention — a rewrite
// is documented to preserve the original request path (req.url stays
// "/api/quote/VCB", not rewritten to "/api/index"), which is exactly what
// this Express app expects. The catch-all filename convention was tried
// first and produced 404s in production for every route despite working
// in local testing, so this is the more explicit, unambiguous mechanism.
export default app;
