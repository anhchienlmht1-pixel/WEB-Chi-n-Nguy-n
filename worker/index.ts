// Cloudflare Workers entry: the same Express app as local dev (server/src/app.ts),
// served through Workers' Node.js HTTP server support. Static files (client/dist)
// are served by Workers Static Assets; only /api/* reaches this code
// (wrangler.jsonc → assets.run_worker_first).
import { httpServerHandler } from "cloudflare:node";
import { app } from "../server/src/app.js";

app.listen(8080);
export default httpServerHandler({ port: 8080 });
