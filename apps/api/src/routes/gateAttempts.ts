import express from "express";
import { z } from "zod";
import { ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";

const gateAttemptsRouter = express.Router();

const gateAttemptsQuerySchema = z.object({
  from_at: z.string().optional(),
  to_at: z.string().optional(),
  playbook_id: z.string().uuid().optional(),
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

function parseIsoDateTime(value: string | undefined, field: "from_at" | "to_at") {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(422, {
      message: "Validation failed.",
      field_errors: {
        [field]: "Enter a valid datetime.",
      },
    });
  }

  return parsed;
}

gateAttemptsRouter.use(requireAuth);

gateAttemptsRouter.get("/gate_attempts", async (req, res, next) => {
  try {
    const query = gateAttemptsQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(query.error),
      });
    }

    const fromAt = parseIsoDateTime(query.data.from_at, "from_at");
    const toAt = parseIsoDateTime(query.data.to_at, "to_at");

    if (query.data.playbook_id) {
      const playbook = await prisma.playbook.findFirst({
        where: {
          id: query.data.playbook_id,
          userId: req.auth!.userId,
        },
        select: {
          id: true,
        },
      });

      if (!playbook) {
        throw new ApiError(404, { message: "Not found." });
      }
    }

    const attempts = await prisma.gateAttempt.findMany({
      where: {
        userId: req.auth!.userId,
        ...(query.data.playbook_id ? { playbookId: query.data.playbook_id } : {}),
        ...(
          fromAt || toAt
            ? {
                attemptedAt: {
                  ...(fromAt ? { gte: fromAt } : {}),
                  ...(toAt ? { lte: toAt } : {}),
                },
              }
            : {}
        ),
      },
      orderBy: [{ attemptedAt: "desc" }],
      select: {
        id: true,
        playbookId: true,
        eventId: true,
        attemptedAt: true,
        blockedByExistingPlannedTrade: true,
        passedGateCount: true,
        totalGates: true,
        allPassed: true,
      },
    });

    res.status(200).json({
      data: attempts.map((attempt) => ({
        gate_attempt_id: attempt.id,
        playbook_id: attempt.playbookId,
        event_id: attempt.eventId,
        attempted_at: attempt.attemptedAt.toISOString(),
        blocked_by_existing_planned_trade: attempt.blockedByExistingPlannedTrade,
        passed_gate_count: attempt.passedGateCount,
        total_gates: attempt.totalGates,
        all_passed: attempt.allPassed,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export { gateAttemptsRouter };
