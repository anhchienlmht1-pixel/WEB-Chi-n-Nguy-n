import { app } from "./app.js";
import { getProvider, initializeRegistry } from "./providers/index.js";

// Initialize provider registry at startup
initializeRegistry();

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Stock API server listening on http://localhost:${PORT} (provider: ${getProvider().id})`);
});
