import { PaperTradeStatus, Prisma } from "@prisma/client";
import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  playbook: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  gateAttempt: {
    create: vi.fn(),
  },
  paperTrade: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../middlewares/rateLimit.js", () => ({
  createJsonRateLimiter: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
}));

import { errorHandler } from "../lib/http.js";
import { csrfProtection, ensureCsrfCookie } from "../middlewares/csrf.js";
import { paperTradesRouter } from "./paperTrades.js";

const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_PLAYBOOK_ID = "22222222-2222-4222-8222-222222222222";
const TEST_EVENT_ID = "33333333-3333-4333-8333-333333333333";
const TEST_TRADE_ID = "44444444-4444-4444-8444-444444444444";
const EXISTING_PLANNED_TRADE_ID = "55555555-5555-4555-8555-555555555555";

function buildPaperTradesTestApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.session = {
      userId: TEST_USER_ID,
      role: "investor",
    } as typeof req.session;
    next();
  });
  app.use(ensureCsrfCookie);
  app.use(csrfProtection);

  app.get("/csrf", (_req, res) => {
    res.status(204).end();
  });

  app.use("/api", paperTradesRouter);
  app.use(errorHandler);

  return app;
}

function buildValidPlaybookForAttempt() {
  return {
    id: TEST_PLAYBOOK_ID,
    thesis: "A".repeat(200),
    keyMetricsJson: ["Revenue growth"],
    invalidationRule: "B".repeat(50),
    maxLossPercent: new Prisma.Decimal(2.5),
    checklistStateJson: {
      prep: true,
      risk: true,
    },
    template: {
      checklistItemsJson: [
        { id: "prep", label: "Prep complete" },
        { id: "risk", label: "Risk reviewed" },
      ],
    },
    event: {
      id: TEST_EVENT_ID,
      watchlistItem: {
        ticker: "AAPL",
      },
    },
    paperTrades: [],
  };
}

function extractCsrfToken(setCookieHeader: string | string[] | undefined) {
  const cookieValues = typeof setCookieHeader === "string" ? [setCookieHeader] : setCookieHeader;
  const cookieHeader = cookieValues?.find((cookie) => cookie.startsWith("csrf_token="));

  if (!cookieHeader) {
    throw new Error("Missing csrf_token cookie in test response.");
  }

  return cookieHeader.split(";")[0]!.replace("csrf_token=", "");
}

async function createAuthenticatedAgent() {
  const app = buildPaperTradesTestApp();
  const agent = request.agent(app);
  const csrfResponse = await agent.get("/csrf");
  const csrfToken = extractCsrfToken(csrfResponse.headers["set-cookie"]);

  return { agent, csrfToken };
}

beforeEach(() => {
  mockPrisma.playbook.findFirst.mockReset();
  mockPrisma.playbook.update.mockReset();
  mockPrisma.gateAttempt.create.mockReset();
  mockPrisma.paperTrade.create.mockReset();
  mockPrisma.paperTrade.findFirst.mockReset();
  mockPrisma.paperTrade.findMany.mockReset();
  mockPrisma.paperTrade.update.mockReset();
  mockPrisma.$transaction.mockReset();
});

describe("paper trade lifecycle validation", () => {
  it("rejects planned to open when required plan fields are missing", async () => {
    mockPrisma.paperTrade.findFirst.mockResolvedValue({
      id: TEST_TRADE_ID,
      playbookId: TEST_PLAYBOOK_ID,
      status: PaperTradeStatus.PLANNED,
      entryPlan: null,
      stopRule: null,
      takeProfitRule: null,
      positionSize: null,
    });

    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post(`/api/paper_trades/${TEST_TRADE_ID}/mark_open`)
      .set("X-CSRF-Token", csrfToken)
      .send({ confirm: true });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      message: "Validation failed.",
      field_errors: {
        entry_plan: "Entry plan is required before opening.",
        stop_rule: "Stop rule is required before opening.",
        take_profit_rule: "Take profit rule is required before opening.",
        position_size: "Position size must be greater than 0 before opening.",
      },
    });
  });

  it("requires pnl_percent when closing an open trade", async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post(`/api/paper_trades/${TEST_TRADE_ID}/close`)
      .set("X-CSRF-Token", csrfToken)
      .send({});

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      message: "Validation failed.",
      field_errors: expect.objectContaining({
        pnl_percent: expect.any(String),
      }),
    });
    expect(mockPrisma.paperTrade.findFirst).not.toHaveBeenCalled();
  });

  it("requires cancel_reason when cancelling a planned or open trade", async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post(`/api/paper_trades/${TEST_TRADE_ID}/cancel`)
      .set("X-CSRF-Token", csrfToken)
      .send({ cancel_reason: "   " });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      message: "Validation failed.",
      field_errors: {
        cancel_reason: "Cancel reason is required.",
      },
    });
    expect(mockPrisma.paperTrade.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "mark_open rejects a non-planned trade",
      path: `/api/paper_trades/${TEST_TRADE_ID}/mark_open`,
      body: { confirm: true },
      trade: {
        id: TEST_TRADE_ID,
        playbookId: TEST_PLAYBOOK_ID,
        status: PaperTradeStatus.OPEN,
        entryPlan: "Entry",
        stopRule: "Stop",
        takeProfitRule: "Target",
        positionSize: new Prisma.Decimal(1),
      },
    },
    {
      name: "close rejects a non-open trade",
      path: `/api/paper_trades/${TEST_TRADE_ID}/close`,
      body: { pnl_percent: 8.5 },
      trade: {
        id: TEST_TRADE_ID,
        status: PaperTradeStatus.PLANNED,
      },
    },
    {
      name: "cancel rejects a closed trade",
      path: `/api/paper_trades/${TEST_TRADE_ID}/cancel`,
      body: { cancel_reason: "No longer relevant" },
      trade: {
        id: TEST_TRADE_ID,
        playbookId: TEST_PLAYBOOK_ID,
        status: PaperTradeStatus.CLOSED,
      },
    },
  ])("$name", async ({ path, body, trade }) => {
    mockPrisma.paperTrade.findFirst.mockResolvedValue(trade);

    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post(path)
      .set("X-CSRF-Token", csrfToken)
      .send(body);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "That transition is not allowed.",
      conflict_type: "invalid_transition",
    });
  });

  it.each([
    { pnlPercent: 12.5, expectedOutcome: "win" },
    { pnlPercent: -4.25, expectedOutcome: "loss" },
    { pnlPercent: 0, expectedOutcome: "flat" },
  ])("returns $expectedOutcome when closing a trade at $pnlPercent% P/L", async ({ pnlPercent, expectedOutcome }) => {
    mockPrisma.paperTrade.findFirst.mockResolvedValue({
      id: TEST_TRADE_ID,
      status: PaperTradeStatus.OPEN,
    });
    mockPrisma.paperTrade.update.mockResolvedValue({
      id: TEST_TRADE_ID,
    });

    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post(`/api/paper_trades/${TEST_TRADE_ID}/close`)
      .set("X-CSRF-Token", csrfToken)
      .send({ pnl_percent: pnlPercent });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: {
        paper_trade_id: TEST_TRADE_ID,
        status: "closed",
        pnl_percent: pnlPercent,
        outcome: expectedOutcome,
      },
      message: "Trade closed.",
    });
    expect(mockPrisma.paperTrade.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: TEST_TRADE_ID,
        },
        data: expect.objectContaining({
          status: PaperTradeStatus.CLOSED,
          pnlPercent,
        }),
      }),
    );
  });
});

describe("create paper trade attempt endpoint", () => {
  it("returns 422 with gate errors and logs a scored GateAttempt when the process gate fails", async () => {
    mockPrisma.playbook.findFirst.mockResolvedValue({
      ...buildValidPlaybookForAttempt(),
      thesis: "Short thesis",
      keyMetricsJson: [],
      invalidationRule: "Too short",
      maxLossPercent: new Prisma.Decimal(0),
      checklistStateJson: {
        prep: false,
        risk: false,
      },
    });
    mockPrisma.gateAttempt.create.mockResolvedValue({
      id: "attempt-1",
    });

    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post("/api/paper_trades/attempt")
      .set("X-CSRF-Token", csrfToken)
      .send({ playbook_id: TEST_PLAYBOOK_ID });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe("Process Gate failed. Fix the gates to continue.");
    expect(response.body.passed_gate_count).toBe(0);
    expect(response.body.gate_errors).toEqual([
      {
        gate: "G1",
        passed: false,
        message: "Thesis must be at least 200 characters.",
      },
      {
        gate: "G2",
        passed: false,
        message: "Add at least one key metric.",
      },
      {
        gate: "G3",
        passed: false,
        message: "Invalidation rule must be at least 50 characters.",
      },
      {
        gate: "G4",
        passed: false,
        message: "Max loss percent must be greater than 0.",
      },
      {
        gate: "G5",
        passed: false,
        message: "Complete every checklist item.",
      },
    ]);
    expect(mockPrisma.gateAttempt.create).toHaveBeenCalledWith({
      data: {
        userId: TEST_USER_ID,
        playbookId: TEST_PLAYBOOK_ID,
        eventId: TEST_EVENT_ID,
        blockedByExistingPlannedTrade: false,
        gateResultsJson: expect.any(Array),
        passedGateCount: 0,
        totalGates: 5,
        allPassed: false,
      },
    });
    expect(mockPrisma.paperTrade.create).not.toHaveBeenCalled();
  });

  it("returns 409 with planned_trade_id and logs a blocked GateAttempt when a planned trade already exists", async () => {
    mockPrisma.playbook.findFirst.mockResolvedValue({
      ...buildValidPlaybookForAttempt(),
      paperTrades: [
        {
          id: EXISTING_PLANNED_TRADE_ID,
        },
      ],
    });
    mockPrisma.gateAttempt.create.mockResolvedValue({
      id: "attempt-2",
    });

    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post("/api/paper_trades/attempt")
      .set("X-CSRF-Token", csrfToken)
      .send({ playbook_id: TEST_PLAYBOOK_ID });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Planned trade already exists.",
      conflict_type: "planned_trade_exists",
      planned_trade_id: EXISTING_PLANNED_TRADE_ID,
    });
    expect(mockPrisma.gateAttempt.create).toHaveBeenCalledWith({
      data: {
        userId: TEST_USER_ID,
        playbookId: TEST_PLAYBOOK_ID,
        eventId: TEST_EVENT_ID,
        blockedByExistingPlannedTrade: true,
        gateResultsJson: Prisma.JsonNull,
        passedGateCount: null,
        totalGates: 5,
        allPassed: false,
      },
    });
  });

  it("returns 201, creates one planned trade, and links the GateAttempt on success", async () => {
    const transactionClient = {
      paperTrade: {
        create: vi.fn().mockResolvedValue({
          id: TEST_TRADE_ID,
        }),
      },
      gateAttempt: {
        create: vi.fn().mockResolvedValue({
          id: "attempt-3",
        }),
      },
    };

    mockPrisma.playbook.findFirst.mockResolvedValue(buildValidPlaybookForAttempt());
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      await callback(transactionClient),
    );

    const { agent, csrfToken } = await createAuthenticatedAgent();
    const response = await agent
      .post("/api/paper_trades/attempt")
      .set("X-CSRF-Token", csrfToken)
      .send({ playbook_id: TEST_PLAYBOOK_ID });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      trade_id: TEST_TRADE_ID,
      redirect_url: `/trades/${TEST_TRADE_ID}`,
      message: "Planned trade created.",
    });
    expect(transactionClient.paperTrade.create).toHaveBeenCalledWith({
      data: {
        userId: TEST_USER_ID,
        playbookId: TEST_PLAYBOOK_ID,
        ticker: "AAPL",
        status: PaperTradeStatus.PLANNED,
      },
      select: {
        id: true,
      },
    });
    expect(transactionClient.gateAttempt.create).toHaveBeenCalledWith({
      data: {
        userId: TEST_USER_ID,
        playbookId: TEST_PLAYBOOK_ID,
        eventId: TEST_EVENT_ID,
        createdPaperTradeId: TEST_TRADE_ID,
        blockedByExistingPlannedTrade: false,
        gateResultsJson: expect.any(Array),
        passedGateCount: 5,
        totalGates: 5,
        allPassed: true,
      },
    });
  });
});
