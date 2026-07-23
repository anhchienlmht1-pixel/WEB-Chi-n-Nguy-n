import { app } from "../server/src/app.js";

// A single catch-all function for every /api/* route, wrapping the same
// Express app the local dev server runs — this is Vercel's own documented
// pattern for deploying an Express app, and the reason we're on it: the
// old one-file-per-route layout (13 functions under api/) exceeded the
// Hobby plan's 12-function-per-deployment cap. An Express app is already a
// valid (req, res) => void handler, so no adapter is needed.
export default app;
