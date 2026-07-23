import { app } from "./app.js";
import { getProvider } from "./providers/index.js";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Stock API server listening on http://localhost:${PORT} (provider: ${getProvider().id})`);
});
