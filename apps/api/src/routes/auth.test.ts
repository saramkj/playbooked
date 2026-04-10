import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}));

const mockArgon2 = vi.hoisted(() => ({
  hash: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("argon2", () => ({
  default: mockArgon2,
}));

vi.mock("../middlewares/rateLimit.js", () => ({
  createJsonRateLimiter: () => (_req: Request, _res: Response, next: NextFunction) => {
    next();
  },
}));

import { ApiError } from "../lib/http.js";
import { csrfProtection } from "../middlewares/csrf.js";
import { authRouter } from "./auth.js";

type FakeResponse = ReturnType<typeof createResponseDouble>;

const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_EMAIL = "user@example.com";
const TEST_PASSWORD = "password123";

function createSessionDouble(seed?: Partial<Request["session"]>) {
  return {
    userId: seed?.userId,
    role: seed?.role,
    regenerate(callback: (error?: unknown) => void) {
      callback();
    },
    save(callback: (error?: unknown) => void) {
      callback();
    },
    destroy(callback: (error?: unknown) => void) {
      this.userId = undefined;
      this.role = undefined;
      callback();
    },
  } as Request["session"];
}

function createResponseDouble() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string | number | readonly string[]>,
    cookies: [] as string[],
    clearedCookies: [] as string[],
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    cookie(name: string, value: string, options?: Record<string, unknown>) {
      this.cookies.push(
        `${name}=${value}; Path=${String(options?.path ?? "/")}; SameSite=${String(options?.sameSite ?? "Lax")}`,
      );
      return this;
    },
    clearCookie(name: string) {
      this.clearedCookies.push(name);
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

async function runAuthRequest(options: {
  method: string;
  path: "/api/auth/register" | "/api/auth/login" | "/api/auth/logout";
  body?: unknown;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  session?: Partial<Request["session"]>;
}) {
  const routePath = options.path.replace("/api/auth", "") || "/";
  const response = createResponseDouble();
  const headerMap = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

  const request = {
    method: options.method,
    path: options.path,
    url: routePath,
    originalUrl: options.path,
    body: options.body,
    cookies: options.cookies ?? {},
    session: createSessionDouble(options.session),
    get(name: string) {
      return headerMap[name.toLowerCase()];
    },
  } as Request;

  const csrfResult = await new Promise<{ error?: unknown }>((resolve) => {
    const next: NextFunction = (error?: unknown) => {
      resolve({ error });
    };

    csrfProtection(request, response as unknown as Response, next);
  });

  if (csrfResult.error) {
    return { error: csrfResult.error, response };
  }

  return await new Promise<{ error?: unknown; response: FakeResponse }>((resolve) => {
    let settled = false;
    const originalJson = response.json.bind(response);

    (response as unknown as { json: Response["json"] }).json = ((payload: unknown) => {
      originalJson(payload);

      if (!settled) {
        settled = true;
        resolve({ response });
      }

      return response as unknown as Response;
    }) as Response["json"];

    const router = authRouter as unknown as {
      handle: (req: Request, res: Response, next: NextFunction) => void;
    };

    router.handle(request, response as unknown as Response, (error?: unknown) => {
      if (!settled) {
        settled = true;
        resolve({ error, response });
      }
    });
  });
}

beforeEach(() => {
  mockPrisma.user.create.mockReset();
  mockPrisma.user.findUnique.mockReset();
  mockArgon2.hash.mockReset();
  mockArgon2.verify.mockReset();
});

describe("auth CSRF behavior", () => {
  it("allows register without a CSRF cookie or header", async () => {
    mockArgon2.hash.mockResolvedValue("hashed-password");
    mockPrisma.user.create.mockResolvedValue({
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      role: "INVESTOR",
      createdAt: new Date("2026-04-10T10:00:00.000Z"),
    });

    const { error, response } = await runAuthRequest({
      method: "POST",
      path: "/api/auth/register",
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    expect(error).toBeUndefined();
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      data: {
        user_id: TEST_USER_ID,
        email: TEST_EMAIL,
        role: "investor",
      },
    });
  });

  it("allows login without a CSRF cookie or header", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      role: "INVESTOR",
      passwordHash: "stored-hash",
    });
    mockArgon2.verify.mockResolvedValue(true);

    const { error, response } = await runAuthRequest({
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    expect(error).toBeUndefined();
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      message: "Logged in.",
      data: {
        user_id: TEST_USER_ID,
        email: TEST_EMAIL,
        role: "investor",
      },
    });
  });

  it("still requires CSRF for logout", async () => {
    const { error } = await runAuthRequest({
      method: "POST",
      path: "/api/auth/logout",
      cookies: {
        csrf_token: "cookie-token",
      },
      session: {
        userId: TEST_USER_ID,
        role: "investor",
      },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
    expect((error as ApiError).body).toEqual({
      message: "Security check failed. Refresh the page and try again.",
    });
  });
});
