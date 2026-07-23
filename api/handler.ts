import { app } from "../server/src/app.js";

// The single function for every /api/* route, wrapping the same Express
// app the local dev server runs. Deliberately named "handler" (not
// "index") to sidestep any special-casing Vercel's file-system routing
// applies to index files — this file's route is unambiguously "/api/
// handler", matching vercel.json's rewrite destination exactly, no
// convention to get wrong. A rewrite (as opposed to a redirect) is
// documented to preserve the original request path (req.url stays
// "/api/quote/VCB", not rewritten to "/api/handler"), which is exactly
// what this Express app's own "/api"-prefixed routes expect.
//
// History: first tried the [...path].ts catch-all filename convention,
// which 404s in production for every route despite working in local
// testing. Then tried an explicit rewrite to "/api/index", which — per
// Vercel's index-file special-casing — actually pointed at a route that
// doesn't exist (index.ts maps to its parent directory's own path, "/api",
// not "/api/index"). This filename removes that whole class of guesswork.
export default app;
