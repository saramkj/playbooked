import {
  EventStatus,
  EventType,
  PaperTradeStatus,
  type Prisma,
} from "@prisma/client";
import express from "express";
import { z } from "zod";
import { calculatePassedGateCount } from "../lib/playbooks.js";
import { ApiError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";

const eventsRouter = express.Router();

const eventIdSchema = z.string().uuid();

const eventTypeValues = ["earnings", "macro", "company_event", "other"] as const;
const eventStatusValues = ["upcoming", "completed"] as const;

const listEventsQuerySchema = z.object({
  status: z.enum(eventStatusValues).optional(),
});

const createEventSchema = z.object({
  watchlist_item_id: z.string().uuid("Select a valid watchlist item."),
  event_type: z.enum(eventTypeValues),
  event_datetime_at: z.string().trim().min(1, "Event datetime is required."),
  notes: z.string().optional(),
});

type EventRecord = {
  id: string;
  watchlistItemId: string;
  eventType: EventType;
  status: EventStatus;
  eventDatetimeAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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

function assertEventId(value: string) {
  if (!eventIdSchema.safeParse(value).success) {
    throw new ApiError(404, { message: "Not found." });
  }
}

function parseEventDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeNotes(notes?: string) {
  const trimmed = notes?.trim();

  return trimmed ? trimmed : null;
}

function serializeEventType(eventType: EventType) {
  switch (eventType) {
    case EventType.EARNINGS:
      return "earnings";
    case EventType.MACRO:
      return "macro";
    case EventType.COMPANY_EVENT:
      return "company_event";
    case EventType.OTHER:
      return "other";
  }
}

function parseEventType(eventType: (typeof eventTypeValues)[number]) {
  switch (eventType) {
    case "earnings":
      return EventType.EARNINGS;
    case "macro":
      return EventType.MACRO;
    case "company_event":
      return EventType.COMPANY_EVENT;
    case "other":
      return EventType.OTHER;
  }
}

function serializeEventStatus(status: EventStatus) {
  return status === EventStatus.COMPLETED ? "completed" : "upcoming";
}

function parseEventStatus(status: (typeof eventStatusValues)[number]) {
  return status === "completed" ? EventStatus.COMPLETED : EventStatus.UPCOMING;
}

function serializeTags(tagsJson: Prisma.JsonValue) {
  if (!Array.isArray(tagsJson)) {
    return [];
  }

  return tagsJson.filter((value): value is string => typeof value === "string");
}

function serializeEventListItem(
  event: EventRecord & {
    watchlistItem: {
      ticker: string;
    };
  },
) {
  return {
    event_id: event.id,
    watchlist_item_id: event.watchlistItemId,
    ticker: event.watchlistItem.ticker,
    event_type: serializeEventType(event.eventType),
    status: serializeEventStatus(event.status),
    event_datetime_at: event.eventDatetimeAt.toISOString(),
    created_at: event.createdAt.toISOString(),
  };
}

function serializeEventDetail(event: EventRecord) {
  return {
    event_id: event.id,
    status: serializeEventStatus(event.status),
    event_type: serializeEventType(event.eventType),
    event_datetime_at: event.eventDatetimeAt.toISOString(),
    ...(event.notes ? { notes: event.notes } : {}),
    created_at: event.createdAt.toISOString(),
    updated_at: event.updatedAt.toISOString(),
  };
}

eventsRouter.use(requireAuth);

eventsRouter.get("/", async (req, res, next) => {
  try {
    const query = listEventsQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(query.error),
      });
    }

    const status = parseEventStatus(query.data.status ?? "upcoming");

    const events = await prisma.event.findMany({
      where: {
        userId: req.auth!.userId,
        status,
      },
      include: {
        watchlistItem: {
          select: {
            ticker: true,
          },
        },
      },
      orderBy: [{ eventDatetimeAt: "asc" }, { createdAt: "asc" }],
    });

    res.status(200).json({
      data: events.map(serializeEventListItem),
    });
  } catch (error) {
    next(error);
  }
});

eventsRouter.post("/", async (req, res, next) => {
  try {
    const result = createEventSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    if (!eventTypeValues.includes(result.data.event_type)) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: {
          event_type: "Choose a valid event type.",
        },
      });
    }

    const eventDatetimeAt = parseEventDateTime(result.data.event_datetime_at);

    if (!eventDatetimeAt) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: {
          event_datetime_at: "Enter a valid event datetime.",
        },
      });
    }

    const watchlistItem = await prisma.watchlistItem.findFirst({
      where: {
        id: result.data.watchlist_item_id,
        userId: req.auth!.userId,
      },
      select: { id: true },
    });

    if (!watchlistItem) {
      throw new ApiError(404, { message: "Not found." });
    }

    const event = await prisma.event.create({
      data: {
        userId: req.auth!.userId,
        watchlistItemId: watchlistItem.id,
        eventType: parseEventType(result.data.event_type),
        eventDatetimeAt,
        notes: normalizeNotes(result.data.notes),
      },
      select: { id: true },
    });

    res.status(200).json({
      data: { event_id: event.id },
      message: "Event created.",
    });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get("/:event_id", async (req, res, next) => {
  try {
    assertEventId(req.params.event_id);

    const event = await prisma.event.findFirst({
      where: {
        id: req.params.event_id,
        userId: req.auth!.userId,
      },
      include: {
        watchlistItem: {
          select: {
            id: true,
            ticker: true,
            tagsJson: true,
          },
        },
        playbook: {
          include: {
            template: {
              select: {
                name: true,
                checklistItemsJson: true,
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
        },
      },
    });

    if (!event) {
      throw new ApiError(404, { message: "Not found." });
    }

    res.status(200).json({
      data: {
        event: serializeEventDetail(event),
        watchlist_item: {
          watchlist_item_id: event.watchlistItem.id,
          ticker: event.watchlistItem.ticker,
          tags: serializeTags(event.watchlistItem.tagsJson),
        },
        playbook_summary: event.playbook
          ? {
              playbook_id: event.playbook.id,
              template_name: event.playbook.template.name,
              passed_gate_count: calculatePassedGateCount({
                thesis: event.playbook.thesis,
                keyMetricsJson: event.playbook.keyMetricsJson,
                invalidationRule: event.playbook.invalidationRule,
                maxLossPercent: event.playbook.maxLossPercent,
                checklistStateJson: event.playbook.checklistStateJson,
                checklistItemsJson: event.playbook.template.checklistItemsJson,
              }),
            }
          : null,
        planned_trade_id: event.playbook?.paperTrades[0]?.id ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

eventsRouter.post("/:event_id/mark_completed", async (req, res, next) => {
  try {
    assertEventId(req.params.event_id);

    const existingEvent = await prisma.event.findFirst({
      where: {
        id: req.params.event_id,
        userId: req.auth!.userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingEvent) {
      throw new ApiError(404, { message: "Not found." });
    }

    if (existingEvent.status === EventStatus.COMPLETED) {
      throw new ApiError(409, {
        message: "This event is already completed.",
        conflict_type: "already_completed",
      });
    }

    const completedAt = new Date();

    const event = await prisma.event.update({
      where: { id: existingEvent.id },
      data: {
        status: EventStatus.COMPLETED,
        completedAt,
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
      },
    });

    res.status(200).json({
      data: {
        event_id: event.id,
        status: serializeEventStatus(event.status),
        completed_at: event.completedAt!.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { eventsRouter };
