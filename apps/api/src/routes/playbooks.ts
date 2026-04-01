import { Prisma } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { parseChecklistState, parseKeyMetrics } from "../lib/playbooks.js";
import { ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";

const playbooksRouter = express.Router();

const playbookIdSchema = z.string().uuid();
const eventIdSchema = z.string().uuid();
const databaseUuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createPlaybookSchema = z.object({
  template_id: z.string().regex(databaseUuidShape, "Choose a valid template."),
});

const updatePlaybookSchema = z.object({
  thesis: z.string(),
  key_metrics: z.array(z.string()),
  invalidation_rule: z.string(),
  max_loss_percent: z.number().positive("Max loss percent must be greater than 0.").nullable(),
  checklist_state: z.record(z.string(), z.boolean()),
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

function assertPlaybookId(value: string) {
  if (!playbookIdSchema.safeParse(value).success) {
    throw new ApiError(404, { message: "Not found." });
  }
}

function assertEventId(value: string) {
  if (!eventIdSchema.safeParse(value).success) {
    throw new ApiError(404, { message: "Not found." });
  }
}

function validateKeyMetrics(keyMetrics: string[]) {
  if (keyMetrics.length > 20) {
    return "Key metrics must contain 20 items or fewer.";
  }

  for (const metric of keyMetrics) {
    if (!metric) {
      return "Key metrics cannot contain empty items.";
    }

    if (metric.length > 80) {
      return "Each key metric must be 80 characters or fewer.";
    }
  }

  return null;
}

function normalizeKeyMetrics(keyMetrics: string[]) {
  return keyMetrics.map((metric) => metric.trim());
}

function serializeMaxLossPercent(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value);
}

function serializePlaybook(playbook: {
  id: string;
  eventId: string;
  templateId: string;
  thesis: string | null;
  keyMetricsJson: Prisma.JsonValue;
  invalidationRule: string | null;
  maxLossPercent: Prisma.Decimal | null;
  checklistStateJson: Prisma.JsonValue;
  isLocked: boolean;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  template: {
    name: string;
  };
}) {
  return {
    playbook_id: playbook.id,
    event_id: playbook.eventId,
    template_id: playbook.templateId,
    template_name: playbook.template.name,
    thesis: playbook.thesis ?? "",
    key_metrics: parseKeyMetrics(playbook.keyMetricsJson),
    invalidation_rule: playbook.invalidationRule ?? "",
    max_loss_percent: serializeMaxLossPercent(playbook.maxLossPercent),
    checklist_state: parseChecklistState(playbook.checklistStateJson),
    is_locked: playbook.isLocked,
    locked_at: playbook.lockedAt ? playbook.lockedAt.toISOString() : null,
    created_at: playbook.createdAt.toISOString(),
    updated_at: playbook.updatedAt.toISOString(),
  };
}

playbooksRouter.use(requireAuth);

playbooksRouter.post("/events/:event_id/playbook", async (req, res, next) => {
  try {
    assertEventId(req.params.event_id);

    const result = createPlaybookSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const [event, template, user] = await Promise.all([
      prisma.event.findFirst({
        where: {
          id: req.params.event_id,
          userId: req.auth!.userId,
        },
        select: { id: true },
      }),
      prisma.template.findFirst({
        where: {
          id: result.data.template_id,
        },
        select: {
          id: true,
          checklistItemsJson: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: req.auth!.userId },
        select: {
          defaultMaxLossPercent: true,
        },
      }),
    ]);

    if (!event) {
      throw new ApiError(404, { message: "Not found." });
    }

    if (!template) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: {
          template_id: "Choose a valid template.",
        },
      });
    }

    const initialChecklistState = Object.fromEntries(
      (Array.isArray(template.checklistItemsJson) ? template.checklistItemsJson : []).flatMap((item) => {
        if (item && typeof item === "object" && "id" in item && typeof item.id === "string") {
          return [[item.id, false] as const];
        }

        return [];
      }),
    );

    const playbook = await prisma.playbook.create({
      data: {
        userId: req.auth!.userId,
        eventId: event.id,
        templateId: template.id,
        thesis: "",
        keyMetricsJson: [],
        invalidationRule: "",
        maxLossPercent: user?.defaultMaxLossPercent ?? null,
        checklistStateJson: initialChecklistState,
        isLocked: false,
      },
      select: { id: true },
    });

    res.status(200).json({
      data: { playbook_id: playbook.id },
      message: "Playbook created.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      next(
        new ApiError(409, {
          message: "Playbook already exists.",
          conflict_type: "already_exists",
        }),
      );
      return;
    }

    next(error);
  }
});

playbooksRouter.get("/playbooks/:playbook_id", async (req, res, next) => {
  try {
    assertPlaybookId(req.params.playbook_id);

    const playbook = await prisma.playbook.findFirst({
      where: {
        id: req.params.playbook_id,
        userId: req.auth!.userId,
      },
      include: {
        template: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!playbook) {
      throw new ApiError(404, { message: "Not found." });
    }

    res.status(200).json({
      data: serializePlaybook(playbook),
    });
  } catch (error) {
    next(error);
  }
});

playbooksRouter.put("/playbooks/:playbook_id", async (req, res, next) => {
  try {
    assertPlaybookId(req.params.playbook_id);

    const result = updatePlaybookSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const normalizedKeyMetrics = normalizeKeyMetrics(result.data.key_metrics);
    const keyMetricsError = validateKeyMetrics(normalizedKeyMetrics);

    if (keyMetricsError) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: {
          key_metrics: keyMetricsError,
        },
      });
    }

    const existingPlaybook = await prisma.playbook.findFirst({
      where: {
        id: req.params.playbook_id,
        userId: req.auth!.userId,
      },
      select: {
        id: true,
        isLocked: true,
      },
    });

    if (!existingPlaybook) {
      throw new ApiError(404, { message: "Not found." });
    }

    if (existingPlaybook.isLocked) {
      throw new ApiError(409, {
        message: "Playbook is locked.",
        conflict_type: "playbook_locked",
      });
    }

    const playbook = await prisma.playbook.update({
      where: {
        id: existingPlaybook.id,
      },
      data: {
        thesis: result.data.thesis,
        keyMetricsJson: normalizedKeyMetrics,
        invalidationRule: result.data.invalidation_rule,
        maxLossPercent: result.data.max_loss_percent,
        checklistStateJson: result.data.checklist_state,
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      data: {
        playbook_id: playbook.id,
        updated_at: playbook.updatedAt.toISOString(),
      },
      message: "Playbook saved.",
    });
  } catch (error) {
    next(error);
  }
});

export { playbooksRouter };
