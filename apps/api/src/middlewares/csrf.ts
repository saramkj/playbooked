import type { NextFunction, Request, Response } from "express";
import { env } from "../lib/env.js";
import { ApiError } from "../lib/http.js";
import { getCsrfCookieToken, getCsrfHeaderToken, issueCsrfCookie } from "../lib/csrf.js";

function isStateChangingMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction) {
  if (!isStateChangingMethod(req.method) && !getCsrfCookieToken(req)) {
    issueCsrfCookie(res);
  }

  next();
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (!isStateChangingMethod(req.method)) {
    next();
    return;
  }

  const cookieToken = getCsrfCookieToken(req);
  const headerToken = getCsrfHeaderToken(req);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(new ApiError(403, { message: "Security check failed. Refresh the page and try again." }));
    return;
  }

  if (req.get("X-CSRF-Token") && env.csrfHeaderName !== "X-CSRF-Token") {
    next(new ApiError(403, { message: "Security check failed. Refresh the page and try again." }));
    return;
  }

  next();
}
