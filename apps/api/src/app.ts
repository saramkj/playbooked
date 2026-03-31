import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { eventsRouter } from "./routes/events.js";
import { env } from "./lib/env.js";
import { createSessionMiddleware } from "./lib/session.js";
import { csrfProtection, ensureCsrfCookie } from "./middlewares/csrf.js";
import { errorHandler } from "./lib/http.js";
import { watchlistRouter } from "./routes/watchlist.js";

export const app = express();

app.set("trust proxy", env.nodeEnv === "production");

app.use(
  cors({
    origin: env.webOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(createSessionMiddleware());
app.use(ensureCsrfCookie);
app.use(csrfProtection);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/watchlist_items", watchlistRouter);
app.use("/api/events", eventsRouter);

app.use(errorHandler);
