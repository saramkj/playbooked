import { PaperTradeStatus, Prisma } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { ApiError } from "../lib/http.js";
import { evaluateProcessGate } from "../lib/playbooks.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";

const paperTradesRouter = express.Router();

const paperTradeIdSchema = z.string().uuid();
const statusValues = ["planned", "open", "closed", "cancelled"] as const;

const attemptSchema = z.object({
  playbook_id: z.string().uuid("Choose a valid playbook."),
});

const listPaperTradesQuerySchema = z.object({
  status: z.enum(statusValues).optional(),
});

function assertPaperTradeId(value: string) {
  if (!paperTradeIdSchema.safeParse(value).success) {
    throw new ApiError(404, { message: "Not found." });
  }
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

function parsePaperTradeStatus(value: (typeof statusValues)[number]) {
  switch (value) {
    case "planned":
      return PaperTradeStatus.PLANNED;
    case "open":
      return PaperTradeStatus.OPEN;
    case "closed":
      return PaperTradeStatus.CLOSED;
    case "cancelled":
      return PaperTradeStatus.CANCELLED;
  }
}

function serializePaperTradeStatus(value: PaperTradeStatus) {
  switch (value) {
    case PaperTradeStatus.PLANNED:
      return "planned";
    case PaperTradeStatus.OPEN:
      return "open";
    case PaperTradeStatus.CLOSED:
      return "closed";
    case PaperTradeStatus.CANCELLED:
      return "cancelled";
  }
}

function serializeDecimal(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value);
}

paperTradesRouter.use(requireAuth);

paperTradesRouter.post("/paper_trades/attempt", async (req, res, next) => {
  try {
    const result = attemptSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const playbook = await prisma.playbook.findFirst({
      where: {
        id: result.data.playbook_id,
        userId: req.auth!.userId,
      },
      include: {
        template: {
          select: {
            checklistItemsJson: true,
          },
        },
        event: {
          select: {
            id: true,
            watchlistItem: {
              select: {
                ticker: true,
              },
            },
          },
        },
        paperTrades: {
          where: {
            status: PaperTradeStatus.PLANNED,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!playbook) {
      throw new ApiError(404, { message: "Not found." });
    }

    const existingPlannedTrade = playbook.paperTrades[0] ?? null;

    if (existingPlannedTrade) {
      await prisma.gateAttempt.create({
        data: {
          userId: req.auth!.userId,
          playbookId: playbook.id,
          eventId: playbook.event.id,
          blockedByExistingPlannedTrade: true,
          gateResultsJson: Prisma.JsonNull,
          passedGateCount: null,
          totalGates: 5,
          allPassed: false,
        },
      });

      throw new ApiError(409, {
        message: "Planned trade already exists.",
        conflict_type: "planned_trade_exists",
        planned_trade_id: existingPlannedTrade.id,
      });
    }

    const gateEvaluation = evaluateProcessGate({
      thesis: playbook.thesis,
      keyMetricsJson: playbook.keyMetricsJson,
      invalidationRule: playbook.invalidationRule,
      maxLossPercent: playbook.maxLossPercent,
      checklistStateJson: playbook.checklistStateJson,
      checklistItemsJson: playbook.template.checklistItemsJson,
    });

    if (!gateEvaluation.allPassed) {
      await prisma.gateAttempt.create({
        data: {
          userId: req.auth!.userId,
          playbookId: playbook.id,
          eventId: playbook.event.id,
          blockedByExistingPlannedTrade: false,
          gateResultsJson: gateEvaluation.gateResults,
          passedGateCount: gateEvaluation.passedGateCount,
          totalGates: gateEvaluation.totalGates,
          allPassed: false,
        },
      });

      throw new ApiError(422, {
        message: "Process Gate failed. Fix the gates to continue.",
        gate_errors: gateEvaluation.gateErrors.map((gate) => ({
          gate: gate.gate,
          passed: false as const,
          message: gate.message,
        })),
        passed_gate_count: gateEvaluation.passedGateCount,
      });
    }

    try {
      const createdTrade = await prisma.$transaction(async (tx) => {
        const trade = await tx.paperTrade.create({
          data: {
            userId: req.auth!.userId,
            playbookId: playbook.id,
            ticker: playbook.event.watchlistItem.ticker,
            status: PaperTradeStatus.PLANNED,
          },
          select: {
            id: true,
          },
        });

        await tx.gateAttempt.create({
          data: {
            userId: req.auth!.userId,
            playbookId: playbook.id,
            eventId: playbook.event.id,
            createdPaperTradeId: trade.id,
            blockedByExistingPlannedTrade: false,
            gateResultsJson: gateEvaluation.gateResults,
            passedGateCount: gateEvaluation.passedGateCount,
            totalGates: gateEvaluation.totalGates,
            allPassed: true,
          },
        });

        return trade;
      });

      res.status(201).json({
        trade_id: createdTrade.id,
        redirect_url: `/trades/${createdTrade.id}`,
        message: "Planned trade created.",
      });
      return;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const plannedTrade = await prisma.paperTrade.findFirst({
          where: {
            playbookId: playbook.id,
            userId: req.auth!.userId,
            status: PaperTradeStatus.PLANNED,
          },
          select: {
            id: true,
          },
        });

        if (plannedTrade) {
          await prisma.gateAttempt.create({
            data: {
              userId: req.auth!.userId,
              playbookId: playbook.id,
              eventId: playbook.event.id,
              blockedByExistingPlannedTrade: true,
              gateResultsJson: Prisma.JsonNull,
              passedGateCount: null,
              totalGates: 5,
              allPassed: false,
            },
          });

          throw new ApiError(409, {
            message: "Planned trade already exists.",
            conflict_type: "planned_trade_exists",
            planned_trade_id: plannedTrade.id,
          });
        }
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
});

paperTradesRouter.get("/paper_trades", async (req, res, next) => {
  try {
    const query = listPaperTradesQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(query.error),
      });
    }

    const trades = await prisma.paperTrade.findMany({
      where: {
        userId: req.auth!.userId,
        ...(query.data.status ? { status: parsePaperTradeStatus(query.data.status) } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        playbookId: true,
        ticker: true,
        status: true,
        createdAt: true,
        openedAt: true,
        closedAt: true,
        cancelledAt: true,
      },
    });

    res.status(200).json({
      data: trades.map((trade) => ({
        paper_trade_id: trade.id,
        playbook_id: trade.playbookId,
        ticker: trade.ticker,
        status: serializePaperTradeStatus(trade.status),
        created_at: trade.createdAt.toISOString(),
        opened_at: trade.openedAt ? trade.openedAt.toISOString() : null,
        closed_at: trade.closedAt ? trade.closedAt.toISOString() : null,
        cancelled_at: trade.cancelledAt ? trade.cancelledAt.toISOString() : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

paperTradesRouter.get("/paper_trades/:paper_trade_id", async (req, res, next) => {
  try {
    assertPaperTradeId(req.params.paper_trade_id);

    const trade = await prisma.paperTrade.findFirst({
      where: {
        id: req.params.paper_trade_id,
        userId: req.auth!.userId,
      },
      select: {
        id: true,
        playbookId: true,
        ticker: true,
        status: true,
        entryPlan: true,
        stopRule: true,
        takeProfitRule: true,
        positionSize: true,
        pnlPercent: true,
        cancelReason: true,
        outcomeNotes: true,
        postMortemNotes: true,
        createdAt: true,
        updatedAt: true,
        openedAt: true,
        closedAt: true,
        cancelledAt: true,
      },
    });

    if (!trade) {
      throw new ApiError(404, { message: "Not found." });
    }

    res.status(200).json({
      data: {
        paper_trade_id: trade.id,
        playbook_id: trade.playbookId,
        ticker: trade.ticker,
        status: serializePaperTradeStatus(trade.status),
        entry_plan: trade.entryPlan ?? "",
        stop_rule: trade.stopRule ?? "",
        take_profit_rule: trade.takeProfitRule ?? "",
        position_size: serializeDecimal(trade.positionSize),
        pnl_percent: serializeDecimal(trade.pnlPercent),
        cancel_reason: trade.cancelReason,
        outcome_notes: trade.outcomeNotes ?? "",
        post_mortem_notes: trade.postMortemNotes ?? "",
        created_at: trade.createdAt.toISOString(),
        updated_at: trade.updatedAt.toISOString(),
        opened_at: trade.openedAt ? trade.openedAt.toISOString() : null,
        closed_at: trade.closedAt ? trade.closedAt.toISOString() : null,
        cancelled_at: trade.cancelledAt ? trade.cancelledAt.toISOString() : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { paperTradesRouter };
