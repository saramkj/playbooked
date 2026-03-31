import "dotenv/config";
import { app } from "./app.js";
import { env } from "./lib/env.js";
import { ensureRedisConnected } from "./lib/session.js";

async function start() {
  await ensureRedisConnected();

  app.listen(env.apiPort, () => {
    console.log(`API listening on http://localhost:${env.apiPort}`);
  });
}

void start();
