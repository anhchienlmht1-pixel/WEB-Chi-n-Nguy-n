import type { IncomingMessage, ServerResponse } from "node:http";
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
// Exported as a plain (req, res) => void function rather than the bare
// Express `app` object directly — an Express app is callable but also
// carries extra properties/methods (.use, .get, .listen...), and after
// bumping @vercel/node from 3.x to 5.x every route started returning
// Vercel's own "FUNCTION_INVOCATION_FAILED" crash page (confirmed live:
// visiting /api/quote/VCB directly showed that exact platform error, not
// this app's own JSON error handling — meaning the crash happens before
// Express's request handling even runs). Wrapping removes any ambiguity
// about how the newer @vercel/node build detects/serializes the export.
//
// History: first tried the [...path].ts catch-all filename convention,
// which 404s in production for every route despite working in local
// testing. Then tried an explicit rewrite to "/api/index", which — per
// Vercel's index-file special-casing — actually pointed at a route that
// doesn't exist (index.ts maps to its parent directory's own path, "/api",
// not "/api/index"). Renaming to "handler.ts" removed that guesswork, and
// fixed the 404s (confirmed: they became 500s), but a crash remained.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req, res);
}
