import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { eventsRouter } from "./routes/events.js";
import { env } from "./lib/env.js";
import { createSessionMiddleware } from "./lib/session.js";
import { csrfProtection, ensureCsrfCookie } from "./middlewares/csrf.js";
import { errorHandler } from "./lib/http.js";
import { gateAttemptsRouter } from "./routes/gateAttempts.js";
import { paperTradesRouter } from "./routes/paperTrades.js";
import { playbooksRouter } from "./routes/playbooks.js";
import { templatesRouter } from "./routes/templates.js";
import { watchlistRouter } from "./routes/watchlist.js";

export const app = express();

app.set("trust proxy", env.trustProxy);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: env.webOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(createSessionMiddleware());
app.use(ensureCsrfCookie);
app.use(csrfProtection);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/watchlist_items", watchlistRouter);
app.use("/api/events", eventsRouter);
app.use("/api", paperTradesRouter);
app.use("/api", gateAttemptsRouter);
app.use("/api", playbooksRouter);

app.use(errorHandler);
