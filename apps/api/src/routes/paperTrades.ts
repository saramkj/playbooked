import { PaperTradeStatus, Prisma } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { ApiError } from "../lib/http.js";
import {
  buildPaginationMeta,
  getPaginationParams,
  paginationQuerySchema,
} from "../lib/pagination.js";
import { evaluateProcessGate } from "../lib/playbooks.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { createJsonRateLimiter } from "../middlewares/rateLimit.js";

const paperTradesRouter = express.Router();

const paperTradeIdSchema = z.string().uuid();
const statusValues = ["planned", "open", "closed", "cancelled"] as const;

const tradeAttemptLimiter = createJsonRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  message: "Too many trade creation attempts. Please try again shortly.",
});

const attemptSchema = z.object({
  playbook_id: z.string().uuid("Choose a valid playbook."),
}).strict();

const listPaperTradesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(statusValues).optional(),
});

const savePlanSchema = z.object({
  entry_plan: z.string(),
  stop_rule: z.string(),
  take_profit_rule: z.string(),
  position_size: z.number().positive("Position size must be greater than 0."),
}).strict();

const markOpenSchema = z.object({
  confirm: z.boolean().refine((value) => value === true, {
    message: "Confirm before opening the trade.",
  }),
}).strict();

const closeTradeSchema = z.object({
  pnl_percent: z.number().min(-100, "P/L must be between -100 and 1000.").max(1000, "P/L must be between -100 and 1000."),
  outcome_notes: z.string().optional(),
  post_mortem_notes: z.string().optional(),
}).strict();

const cancelTradeSchema = z.object({
  cancel_reason: z.string().trim().min(1, "Cancel reason is required."),
}).strict();

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

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildInvalidTransitionError() {
  return new ApiError(409, {
    message: "That transition is not allowed.",
    conflict_type: "invalid_transition",
  });
}

function getOpenValidationErrors(trade: {
  entryPlan: string | null;
  stopRule: string | null;
  takeProfitRule: string | null;
  positionSize: Prisma.Decimal | null;
}) {
  const fieldErrors: Record<string, string> = {};

  if (!trade.entryPlan?.trim()) {
    fieldErrors.entry_plan = "Entry plan is required before opening.";
  }

  if (!trade.stopRule?.trim()) {
    fieldErrors.stop_rule = "Stop rule is required before opening.";
  }

  if (!trade.takeProfitRule?.trim()) {
    fieldErrors.take_profit_rule = "Take profit rule is required before opening.";
  }

  if (trade.positionSize === null || Number(trade.positionSize) <= 0) {
    fieldErrors.position_size = "Position size must be greater than 0 before opening.";
  }

  return fieldErrors;
}

paperTradesRouter.use(requireAuth);

paperTradesRouter.post("/paper_trades/attempt", tradeAttemptLimiter, async (req, res, next) => {
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

    const { page, page_size: pageSize } = query.data;
    const where = {
      userId: req.auth!.userId,
      ...(query.data.status ? { status: parsePaperTradeStatus(query.data.status) } : {}),
    };
    const { skip, take } = getPaginationParams({ page, pageSize });

    const [trades, totalItems] = await Promise.all([
      prisma.paperTrade.findMany({
        where,
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
        skip,
        take,
      }),
      prisma.paperTrade.count({ where }),
    ]);

    res.status(200).json({
      data: {
        items: trades.map((trade) => ({
          paper_trade_id: trade.id,
          playbook_id: trade.playbookId,
          ticker: trade.ticker,
          status: serializePaperTradeStatus(trade.status),
          created_at: trade.createdAt.toISOString(),
          opened_at: trade.openedAt ? trade.openedAt.toISOString() : null,
          closed_at: trade.closedAt ? trade.closedAt.toISOString() : null,
          cancelled_at: trade.cancelledAt ? trade.cancelledAt.toISOString() : null,
        })),
        ...buildPaginationMeta({
          page,
          pageSize,
          totalItems,
        }),
      },
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

paperTradesRouter.put("/paper_trades/:paper_trade_id/plan", async (req, res, next) => {
  try {
    assertPaperTradeId(req.params.paper_trade_id);

    const result = savePlanSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const trade = await prisma.paperTrade.findFirst({
      where: {
        id: req.params.paper_trade_id,
        userId: req.auth!.userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!trade) {
      throw new ApiError(404, { message: "Not found." });
    }

    if (trade.status !== PaperTradeStatus.PLANNED && trade.status !== PaperTradeStatus.OPEN) {
      throw buildInvalidTransitionError();
    }

    await prisma.paperTrade.update({
      where: {
        id: trade.id,
      },
      data: {
        entryPlan: result.data.entry_plan.trim(),
        stopRule: result.data.stop_rule.trim(),
        takeProfitRule: result.data.take_profit_rule.trim(),
        positionSize: result.data.position_size,
      },
    });

    res.status(200).json({
      data: {
        paper_trade_id: trade.id,
      },
      message: "Plan saved.",
    });
  } catch (error) {
    next(error);
  }
});

paperTradesRouter.post("/paper_trades/:paper_trade_id/mark_open", async (req, res, next) => {
  try {
    assertPaperTradeId(req.params.paper_trade_id);

    const result = markOpenSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const trade = await prisma.paperTrade.findFirst({
      where: {
        id: req.params.paper_trade_id,
        userId: req.auth!.userId,
      },
      select: {
        id: true,
        playbookId: true,
        status: true,
        entryPlan: true,
        stopRule: true,
        takeProfitRule: true,
        positionSize: true,
      },
    });

    if (!trade) {
      throw new ApiError(404, { message: "Not found." });
    }

    if (trade.status !== PaperTradeStatus.PLANNED) {
      throw buildInvalidTransitionError();
    }

    const fieldErrors = getOpenValidationErrors(trade);

    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: fieldErrors,
      });
    }

    const openedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.paperTrade.update({
        where: {
          id: trade.id,
        },
        data: {
          status: PaperTradeStatus.OPEN,
          openedAt,
        },
      });

      await tx.playbook.update({
        where: {
          id: trade.playbookId,
        },
        data: {
          isLocked: true,
          lockedAt: openedAt,
        },
      });
    });

    res.status(200).json({
      data: {
        paper_trade_id: trade.id,
        status: "open",
        opened_at: openedAt.toISOString(),
      },
      message: "Trade opened.",
    });
  } catch (error) {
    next(error);
  }
});

paperTradesRouter.post("/paper_trades/:paper_trade_id/close", async (req, res, next) => {
  try {
    assertPaperTradeId(req.params.paper_trade_id);

    const result = closeTradeSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const trade = await prisma.paperTrade.findFirst({
      where: {
        id: req.params.paper_trade_id,
        userId: req.auth!.userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!trade) {
      throw new ApiError(404, { message: "Not found." });
    }

    if (trade.status !== PaperTradeStatus.OPEN) {
      throw buildInvalidTransitionError();
    }

    const closedAt = new Date();
    const outcome = result.data.pnl_percent > 0 ? "win" : result.data.pnl_percent < 0 ? "loss" : "flat";

    await prisma.paperTrade.update({
      where: {
        id: trade.id,
      },
      data: {
        status: PaperTradeStatus.CLOSED,
        pnlPercent: result.data.pnl_percent,
        outcomeNotes: normalizeOptionalText(result.data.outcome_notes),
        postMortemNotes: normalizeOptionalText(result.data.post_mortem_notes),
        closedAt,
      },
    });

    res.status(200).json({
      data: {
        paper_trade_id: trade.id,
        status: "closed",
        closed_at: closedAt.toISOString(),
        pnl_percent: result.data.pnl_percent,
        outcome,
      },
      message: "Trade closed.",
    });
  } catch (error) {
    next(error);
  }
});

paperTradesRouter.post("/paper_trades/:paper_trade_id/cancel", async (req, res, next) => {
  try {
    assertPaperTradeId(req.params.paper_trade_id);

    const result = cancelTradeSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const trade = await prisma.paperTrade.findFirst({
      where: {
        id: req.params.paper_trade_id,
        userId: req.auth!.userId,
      },
      select: {
        id: true,
        playbookId: true,
        status: true,
      },
    });

    if (!trade) {
      throw new ApiError(404, { message: "Not found." });
    }

    if (trade.status !== PaperTradeStatus.PLANNED && trade.status !== PaperTradeStatus.OPEN) {
      throw buildInvalidTransitionError();
    }

    const cancelledAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.paperTrade.update({
        where: {
          id: trade.id,
        },
        data: {
          status: PaperTradeStatus.CANCELLED,
          cancelReason: result.data.cancel_reason.trim(),
          cancelledAt,
        },
      });

      const playbookTrades = await tx.paperTrade.findMany({
        where: {
          playbookId: trade.playbookId,
          userId: req.auth!.userId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      const canUnlock =
        trade.status === PaperTradeStatus.PLANNED &&
        playbookTrades.length === 1 &&
        playbookTrades[0]?.id === trade.id &&
        playbookTrades[0]?.status === PaperTradeStatus.CANCELLED;

      if (canUnlock) {
        await tx.playbook.update({
          where: {
            id: trade.playbookId,
          },
          data: {
            isLocked: false,
            lockedAt: null,
          },
        });
      }
    });

    res.status(200).json({
      data: {
        paper_trade_id: trade.id,
        status: "cancelled",
        cancelled_at: cancelledAt.toISOString(),
      },
      message: "Trade cancelled.",
    });
  } catch (error) {
    next(error);
  }
});

export { paperTradesRouter };
