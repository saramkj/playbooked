import "dotenv/config";
import { app } from "./app.js";
import { env } from "./lib/env.js";
import { ensureRedisConnected } from "./lib/session.js";

async function start() {
  await ensureRedisConnected();

  const host = env.isProduction ? "0.0.0.0" : undefined;
  const onListen = () => {
    const displayHost = host ?? "localhost";
    console.log(`API listening on http://${displayHost}:${env.apiPort}`);
  };

  if (host) {
    app.listen(env.apiPort, host, onListen);
    return;
  }

  app.listen(env.apiPort, onListen);
}

void start();
