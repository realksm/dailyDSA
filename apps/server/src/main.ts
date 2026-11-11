// Entry point: `pnpm server` (dev: `pnpm --filter @dailydsa/server dev`).
import { createPool, migrate } from "@dailydsa/db";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
await migrate(config.databaseUrl);
const pool = createPool(config.databaseUrl);
const app = createApp({ config, pool });

const server = app.listen(config.port, config.host, () => {
  console.log(`dailyDSA server on http://${config.host}:${config.port}`);
});

let stopping = false;
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: shutting down`);
  server.close(() => void pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref(); // don't hang on keep-alive connections
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
