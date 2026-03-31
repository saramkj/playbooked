import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { env } from "./env.js";

function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: env.nodeEnv === "production",
    path: "/",
    maxAge: env.sessionTtlSeconds * 1000,
  };
}

export function createCsrfToken() {
  return randomBytes(32).toString("hex");
}

export function getCsrfCookieToken(req: Request) {
  return req.cookies?.[env.csrfCookieName] as string | undefined;
}

export function getCsrfHeaderToken(req: Request) {
  return req.get(env.csrfHeaderName);
}

export function issueCsrfCookie(res: Response, token = createCsrfToken()) {
  res.cookie(env.csrfCookieName, token, csrfCookieOptions());
  return token;
}

export function clearCsrfCookie(res: Response) {
  res.clearCookie(env.csrfCookieName, {
    ...csrfCookieOptions(),
    maxAge: undefined,
  });
}
