// Entry point: `pnpm server` (dev: `pnpm --filter @dailydsa/server dev`).
import { createPool, migrate } from "@dailydsa/db";
import { GoJudge } from "@dailydsa/judge";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { startDailyRollover } from "./daily.js";
import { createMailer } from "./mailer.js";
import { startStreakReminders } from "./reminders.js";
import { startJudgeWorker } from "./submissions.js";

const config = loadConfig();
await migrate(config.databaseUrl);
const pool = createPool(config.databaseUrl);
const log = { info: console.log, error: console.error };
const worker = startJudgeWorker(pool, { gj: new GoJudge(config.judgeUrl), dataDir: config.dataDir, log });
const mailer = createMailer(config);
const app = createApp({ config, pool, mailer, onQueued: worker.kick });
const stopRollover = startDailyRollover(pool, log);
const stopReminders = startStreakReminders(pool, mailer, config, log);

const server = app.listen(config.port, config.host, () => {
  console.log(`dailyDSA server on http://${config.host}:${config.port}`);
});

let stopping = false;
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  stopRollover();
  stopReminders();
  console.log(`${signal}: shutting down`);
  // Let the submission being judged finish; if that takes too long, boot requeues it.
  server.close(() => void worker.stop().then(() => pool.end()).finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref(); // don't hang on keep-alive connections
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
