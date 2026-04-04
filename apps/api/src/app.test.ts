import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  watchlistItem: {
    create: vi.fn(),
  },
  event: {
    findFirst: vi.fn(),
  },
}));

vi.mock("./lib/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("argon2", () => ({
  default: {
    hash: vi.fn(),
    verify: vi.fn(),
  },
}));

import { ApiError } from "./lib/http.js";
import { requireAuth } from "./middlewares/auth.js";
import { loginRateLimiter } from "./routes/auth.js";
import { getEventDetailHandler } from "./routes/events.js";
import { createWatchlistItemHandler } from "./routes/watchlist.js";

type FakeResponse = ReturnType<typeof createResponseDouble>;

function createResponseDouble() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string | number | readonly string[]>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      this.headers[name.toLowerCase()] = Array.isArray(value) ? [...value] : value;
    },
    getHeader(name: string) {
      return this.headers[name.toLowerCase()];
    },
    header(name: string, value: string | number | readonly string[]) {
      this.setHeader(name, value);
      return this;
    },
    removeHeader(name: string) {
      delete this.headers[name.toLowerCase()];
    },
  };
}

async function runMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => unknown,
  req: unknown,
  res: unknown = createResponseDouble(),
) {
  const response = res as Response & FakeResponse;

  return await new Promise<{ error?: unknown; response: Response }>((resolve) => {
    let settled = false;
    const originalJson = response.json?.bind(response);

    (response as unknown as { json: Response["json"] }).json = ((payload: unknown) => {
      originalJson?.(payload);

      if (!settled) {
        settled = true;
        resolve({ response });
      }

      return response;
    }) as Response["json"];

    const next: NextFunction = (error?: unknown) => {
      if (!settled) {
        settled = true;
        resolve({ error, response });
      }
    };

    void middleware(req as Request, response, next);
  });
}

beforeEach(() => {
  mockPrisma.watchlistItem.create.mockReset();
  mockPrisma.event.findFirst.mockReset();
});

describe("security baseline", () => {
  it("returns 401 for protected requests without a session", async () => {
    const { error } = await runMiddleware(requireAuth, {
      session: {} as Request["session"],
    });

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).body.message).toBe("Session expired. Please log in again.");
  });

  it("returns 404 for non-owner resource access", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(null);

    const { error } = await runMiddleware(getEventDetailHandler, {
      params: {
        event_id: "11111111-1111-1111-1111-111111111111",
      },
      auth: {
        userId: "user-1",
        role: "investor",
      },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).body.message).toBe("Not found.");
  });

  it("returns 422 for invalid payloads on protected writes", async () => {
    const { error } = await runMiddleware(createWatchlistItemHandler, {
      body: {
        ticker: "",
        tags: [],
      },
      auth: {
        userId: "user-1",
        role: "investor",
      },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).body).toMatchObject({
      message: "Validation failed.",
      field_errors: {
        ticker: "Ticker is required.",
      },
    });
  });

  it("returns 429 after repeated login attempts", async () => {
    const baseReq: unknown = {
      method: "POST",
      ip: "127.0.0.1",
      app: {
        get: vi.fn().mockReturnValue(false),
      },
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await runMiddleware(loginRateLimiter, baseReq);

      expect(result.error).toBeUndefined();
      expect(result.response.statusCode).toBe(200);
    }

    const rateLimited = await runMiddleware(loginRateLimiter, baseReq);

    expect(rateLimited.response.statusCode).toBe(429);
    expect((rateLimited.response as unknown as FakeResponse).body).toEqual({
      message: "Too many login attempts. Please try again in 10 minutes.",
      code: "rate_limited",
    });
  });
});
