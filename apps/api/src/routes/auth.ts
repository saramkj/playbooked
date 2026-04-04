import argon2 from "argon2";
import { Prisma, UserRole } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { clearCsrfCookie, issueCsrfCookie } from "../lib/csrf.js";
import { env } from "../lib/env.js";
import { ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { createJsonRateLimiter } from "../middlewares/rateLimit.js";
import {
  clearSessionCookie,
  destroySession,
  regenerateSession,
  saveSession,
} from "../lib/session.js";
import { requireAuth } from "../middlewares/auth.js";

const authRouter = express.Router();

export const registerRateLimiter = createJsonRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: "Too many registration attempts. Please try again in 10 minutes.",
});

export const loginRateLimiter = createJsonRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: "Too many login attempts. Please try again in 10 minutes.",
});

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
}).strict();

type AuthUserResponse = {
  user_id: string;
  email: string;
  role: "investor" | "admin";
  created_at?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function serializeRole(role: UserRole) {
  return role === UserRole.ADMIN ? "admin" : "investor";
}

function serializeUser(user: {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: Date;
}, options?: { includeCreatedAt?: boolean }): AuthUserResponse {
  return {
    user_id: user.id,
    email: user.email,
    role: serializeRole(user.role),
    ...(options?.includeCreatedAt && user.createdAt
      ? { created_at: user.createdAt.toISOString() }
      : {}),
  };
}

function getFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");

    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}

async function establishAuthenticatedSession(
  req: express.Request,
  res: express.Response,
  user: { id: string; role: UserRole },
) {
  await regenerateSession(req);
  req.session.userId = user.id;
  req.session.role = serializeRole(user.role);
  await saveSession(req);
  issueCsrfCookie(res);
}

authRouter.post("/register", registerRateLimiter, async (req, res, next) => {
  try {
    const result = credentialsSchema.safeParse(req.body);

    if (!result.success) {
      next(
        new ApiError(422, {
          message: "Validation failed.",
          field_errors: getFieldErrors(result.error),
        }),
      );
      return;
    }

    const email = normalizeEmail(result.data.email);
    const passwordHash = await argon2.hash(result.data.password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.INVESTOR,
      },
    });

    await establishAuthenticatedSession(req, res, user);

    res.status(200).json({
      data: serializeUser({
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      }, { includeCreatedAt: true }),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      next(
        new ApiError(409, {
          message: "Account already exists. Log in instead.",
          conflict_type: "duplicate",
        }),
      );
      return;
    }

    next(error);
  }
});

authRouter.post("/login", loginRateLimiter, async (req, res, next) => {
  try {
    const result = credentialsSchema.safeParse(req.body);

    if (!result.success) {
      next(
        new ApiError(422, {
          message: "Validation failed.",
          field_errors: getFieldErrors(result.error),
        }),
      );
      return;
    }

    const email = normalizeEmail(result.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      next(new ApiError(401, { message: "Email or password is incorrect." }));
      return;
    }

    const isValid = await argon2.verify(user.passwordHash, result.data.password);

    if (!isValid) {
      next(new ApiError(401, { message: "Email or password is incorrect." }));
      return;
    }

    await establishAuthenticatedSession(req, res, user);

    res.status(200).json({
      data: serializeUser(user),
      message: "Logged in.",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await destroySession(req);

    res.clearCookie(env.sessionCookieName, clearSessionCookie(req));
    clearCsrfCookie(res);

    res.status(200).json({
      data: { ok: true },
      message: "Logged out.",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) {
      next(new ApiError(401, { message: "Session expired. Please log in again." }));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });

    if (!user) {
      res.clearCookie(env.sessionCookieName, clearSessionCookie(req));
      clearCsrfCookie(res);
      next(new ApiError(401, { message: "Session expired. Please log in again." }));
      return;
    }

    res.status(200).json({
      data: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

export { authRouter };
