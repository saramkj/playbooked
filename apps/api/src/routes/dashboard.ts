import { PaperTradeStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";

const dashboardRouter = express.Router();

const dashboardWeeklyQuerySchema = z.object({
  week_start_at: z.string().optional(),
});

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

function isUtcMidnightIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(value);
}

function getUtcWeekWindow(weekStartAt?: string) {
  if (weekStartAt) {
    if (!isUtcMidnightIsoDate(weekStartAt)) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: {
          week_start_at: "Enter a valid UTC week start at 00:00:00Z.",
        },
      });
    }

    const parsedWeekStart = new Date(weekStartAt);

    if (Number.isNaN(parsedWeekStart.getTime())) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: {
          week_start_at: "Enter a valid UTC week start at 00:00:00Z.",
        },
      });
    }

    if (parsedWeekStart.getUTCDay() !== 1) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: {
          week_start_at: "Week start must be a Monday at 00:00:00Z.",
        },
      });
    }

    const nextWeekStart = new Date(parsedWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      weekStart: parsedWeekStart,
      nextWeekStart,
      weekEnd: new Date(nextWeekStart.getTime() - 1),
    };
  }

  const now = new Date();
  const currentUtcDay = now.getUTCDay();
  const daysSinceMonday = (currentUtcDay + 6) % 7;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday, 0, 0, 0, 0),
  );
  const nextWeekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    weekStart,
    nextWeekStart,
    weekEnd: new Date(nextWeekStart.getTime() - 1),
  };
}

function serializeDecimal(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value);
}

dashboardRouter.use(requireAuth);

export async function getDashboardWeeklyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = dashboardWeeklyQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(query.error),
      });
    }

    const { nextWeekStart, weekEnd, weekStart } = getUtcWeekWindow(query.data.week_start_at);
    const attemptedAtWindow = {
      gte: weekStart,
      lt: nextWeekStart,
    };
    const closedAtWindow = {
      gte: weekStart,
      lt: nextWeekStart,
    };

    const [
      scoredAttemptAggregate,
      plannedConflictsThisWeek,
      closedTradeAggregate,
      winCount,
    ] = await Promise.all([
      prisma.gateAttempt.aggregate({
        where: {
          userId: req.auth!.userId,
          blockedByExistingPlannedTrade: false,
          attemptedAt: attemptedAtWindow,
        },
        _count: {
          passedGateCount: true,
        },
        _avg: {
          passedGateCount: true,
        },
      }),
      prisma.gateAttempt.count({
        where: {
          userId: req.auth!.userId,
          blockedByExistingPlannedTrade: true,
          attemptedAt: attemptedAtWindow,
        },
      }),
      prisma.paperTrade.aggregate({
        where: {
          userId: req.auth!.userId,
          status: PaperTradeStatus.CLOSED,
          closedAt: closedAtWindow,
        },
        _count: {
          _all: true,
        },
        _avg: {
          pnlPercent: true,
        },
      }),
      prisma.paperTrade.count({
        where: {
          userId: req.auth!.userId,
          status: PaperTradeStatus.CLOSED,
          closedAt: closedAtWindow,
          pnlPercent: {
            gt: 0,
          },
        },
      }),
    ]);

    const attemptCountScored = scoredAttemptAggregate._count.passedGateCount;
    const avgPassedGateCount = scoredAttemptAggregate._avg.passedGateCount;
    const closedTradeCount = closedTradeAggregate._count._all;
    const avgPnlPercent = serializeDecimal(closedTradeAggregate._avg.pnlPercent);

    res.status(200).json({
      data: {
        week_start_at: weekStart.toISOString(),
        week_end_at: weekEnd.toISOString(),
        process_score_week: attemptCountScored > 0 && avgPassedGateCount !== null
          ? Number(((avgPassedGateCount / 5) * 100).toFixed(4))
          : null,
        attempt_count_scored: attemptCountScored,
        planned_conflicts_this_week: plannedConflictsThisWeek,
        closed_trade_count: closedTradeCount,
        win_rate: closedTradeCount > 0 ? Number((winCount / closedTradeCount).toFixed(4)) : null,
        avg_pnl_percent: closedTradeCount > 0 ? avgPnlPercent : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

dashboardRouter.get("/weekly", getDashboardWeeklyHandler);

export { dashboardRouter };
