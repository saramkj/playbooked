import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

type JsonRateLimiterOptions = {
  windowMs: number;
  limit: number;
  message: string;
};

function getRateLimitKey(req: Request) {
  const ip = req.ip || req.socket?.remoteAddress;

  if (ip) {
    return ipKeyGenerator(ip);
  }

  return "unknown-client";
}

export function createJsonRateLimiter({
  windowMs,
  limit,
  message,
}: JsonRateLimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getRateLimitKey,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
    },
    handler: (_req, res) => {
      res.status(429).json({
        message,
        code: "rate_limited",
      });
    },
  });
}
