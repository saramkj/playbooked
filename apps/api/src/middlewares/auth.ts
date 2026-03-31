import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/http.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.role) {
    next(new ApiError(401, { message: "Session expired. Please log in again." }));
    return;
  }

  req.auth = {
    userId: req.session.userId,
    role: req.session.role,
  };

  next();
}
