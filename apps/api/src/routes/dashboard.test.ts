import type { NextFunction, Request, Response } from "express";
import { PaperTradeStatus, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  gateAttempt: {
    aggregate: vi.fn(),
    count: vi.fn(),
  },
  paperTrade: {
    aggregate: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: mockPrisma,
}));

import { ApiError } from "../lib/http.js";
import { getDashboardWeeklyHandler } from "./dashboard.js";

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

async function runHandler(
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
  req: unknown,
  res: unknown = createResponseDouble(),
) {
  const response = res as Response & FakeResponse;

  return await new Promise<{ error?: unknown; response: Response & FakeResponse }>((resolve) => {
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

    void handler(req as Request, response, next);
  });
}

beforeEach(() => {
  mockPrisma.gateAttempt.aggregate.mockReset();
  mockPrisma.gateAttempt.count.mockReset();
  mockPrisma.paperTrade.aggregate.mockReset();
  mockPrisma.paperTrade.count.mockReset();
});

describe("dashboard weekly stats", () => {
  it("returns null score and outcome metrics when no scored attempts or closed trades exist", async () => {
    mockPrisma.gateAttempt.aggregate.mockResolvedValue({
      _count: {
        passedGateCount: 0,
      },
      _avg: {
        passedGateCount: null,
      },
    });
    mockPrisma.gateAttempt.count.mockResolvedValue(2);
    mockPrisma.paperTrade.aggregate.mockResolvedValue({
      _count: {
        _all: 0,
      },
      _avg: {
        pnlPercent: null,
      },
    });
    mockPrisma.paperTrade.count.mockResolvedValue(0);

    const { error, response } = await runHandler(getDashboardWeeklyHandler, {
      query: {},
      auth: {
        userId: "11111111-1111-4111-8111-111111111111",
        role: "investor",
      },
    });

    expect(error).toBeUndefined();
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      data: {
        process_score_week: null,
        attempt_count_scored: 0,
        planned_conflicts_this_week: 2,
        closed_trade_count: 0,
        win_rate: null,
        avg_pnl_percent: null,
      },
    });
    expect((response.body as { data: { week_start_at: string; week_end_at: string } }).data.week_start_at).toEqual(expect.any(String));
    expect((response.body as { data: { week_start_at: string; week_end_at: string } }).data.week_end_at).toEqual(expect.any(String));
  });

  it("calculates weekly stats using only scored attempts and closed trades in the selected UTC week", async () => {
    mockPrisma.gateAttempt.aggregate.mockResolvedValue({
      _count: {
        passedGateCount: 3,
      },
      _avg: {
        passedGateCount: 4,
      },
    });
    mockPrisma.gateAttempt.count.mockResolvedValue(1);
    mockPrisma.paperTrade.aggregate.mockResolvedValue({
      _count: {
        _all: 3,
      },
      _avg: {
        pnlPercent: new Prisma.Decimal("5.2"),
      },
    });
    mockPrisma.paperTrade.count.mockResolvedValue(2);

    const { error, response } = await runHandler(getDashboardWeeklyHandler, {
      query: {
        week_start_at: "2026-02-09T00:00:00Z",
      },
      auth: {
        userId: "11111111-1111-4111-8111-111111111111",
        role: "investor",
      },
    });

    expect(error).toBeUndefined();
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      data: {
        week_start_at: "2026-02-09T00:00:00.000Z",
        week_end_at: "2026-02-15T23:59:59.999Z",
        process_score_week: 80,
        attempt_count_scored: 3,
        planned_conflicts_this_week: 1,
        closed_trade_count: 3,
        win_rate: 0.6667,
        avg_pnl_percent: 5.2,
      },
    });
    expect(mockPrisma.gateAttempt.aggregate).toHaveBeenCalledWith({
      where: {
        userId: "11111111-1111-4111-8111-111111111111",
        blockedByExistingPlannedTrade: false,
        attemptedAt: {
          gte: new Date("2026-02-09T00:00:00.000Z"),
          lt: new Date("2026-02-16T00:00:00.000Z"),
        },
      },
      _count: {
        passedGateCount: true,
      },
      _avg: {
        passedGateCount: true,
      },
    });
    expect(mockPrisma.gateAttempt.count).toHaveBeenCalledWith({
      where: {
        userId: "11111111-1111-4111-8111-111111111111",
        blockedByExistingPlannedTrade: true,
        attemptedAt: {
          gte: new Date("2026-02-09T00:00:00.000Z"),
          lt: new Date("2026-02-16T00:00:00.000Z"),
        },
      },
    });
    expect(mockPrisma.paperTrade.aggregate).toHaveBeenCalledWith({
      where: {
        userId: "11111111-1111-4111-8111-111111111111",
        status: PaperTradeStatus.CLOSED,
        closedAt: {
          gte: new Date("2026-02-09T00:00:00.000Z"),
          lt: new Date("2026-02-16T00:00:00.000Z"),
        },
      },
      _count: {
        _all: true,
      },
      _avg: {
        pnlPercent: true,
      },
    });
    expect(mockPrisma.paperTrade.count).toHaveBeenCalledWith({
      where: {
        userId: "11111111-1111-4111-8111-111111111111",
        status: PaperTradeStatus.CLOSED,
        closedAt: {
          gte: new Date("2026-02-09T00:00:00.000Z"),
          lt: new Date("2026-02-16T00:00:00.000Z"),
        },
        pnlPercent: {
          gt: 0,
        },
      },
    });
  });

  it("rejects a week start that is not a Monday UTC midnight", async () => {
    const { error } = await runHandler(getDashboardWeeklyHandler, {
      query: {
        week_start_at: "2026-02-10T00:00:00Z",
      },
      auth: {
        userId: "11111111-1111-4111-8111-111111111111",
        role: "investor",
      },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).body).toEqual({
      message: "Validation failed.",
      field_errors: {
        week_start_at: "Week start must be a Monday at 00:00:00Z.",
      },
    });
    expect(mockPrisma.gateAttempt.aggregate).not.toHaveBeenCalled();
    expect(mockPrisma.paperTrade.aggregate).not.toHaveBeenCalled();
  });
});
