import { Prisma } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { ApiError } from "../lib/http.js";
import {
  buildPaginationMeta,
  getPaginationParams,
  paginationQuerySchema,
} from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { createJsonRateLimiter } from "../middlewares/rateLimit.js";

const watchlistRouter = express.Router();

const watchlistIdSchema = z.string().uuid();

const createWatchlistLimiter = createJsonRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message: "Too many watchlist write requests. Please slow down and try again shortly.",
});

const createWatchlistItemSchema = z.object({
  ticker: z.string(),
  tags: z.array(z.string()).default([]),
}).strict();

const updateWatchlistItemSchema = z.object({
  tags: z.array(z.string()),
}).strict();

const listWatchlistQuerySchema = paginationQuerySchema;

type WatchlistItemRecord = {
  id: string;
  ticker: string;
  tagsJson: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeTicker(rawTicker: string) {
  return rawTicker.trim().toUpperCase();
}

function normalizeTags(rawTags: string[]) {
  return rawTags.map((tag) => tag.trim());
}

function validateTicker(ticker: string) {
  if (!ticker) {
    return "Ticker is required.";
  }

  if (!/^[A-Z0-9.-]{1,10}$/.test(ticker)) {
    return "Ticker must match ^[A-Z0-9.-]{1,10}$.";
  }

  return null;
}

function validateTags(tags: string[]) {
  if (tags.length > 10) {
    return "Tags must contain 10 items or fewer.";
  }

  for (const tag of tags) {
    if (!tag) {
      return "Tags cannot be empty.";
    }

    if (tag.length > 20) {
      return "Tags must be 20 characters or fewer.";
    }
  }

  return null;
}

function assertWatchlistId(value: string) {
  if (!watchlistIdSchema.safeParse(value).success) {
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

function serializeTags(tagsJson: Prisma.JsonValue) {
  if (!Array.isArray(tagsJson)) {
    return [];
  }

  return tagsJson.filter((value): value is string => typeof value === "string");
}

function serializeWatchlistItem(item: WatchlistItemRecord) {
  return {
    watchlist_item_id: item.id,
    ticker: item.ticker,
    tags: serializeTags(item.tagsJson),
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString(),
  };
}

function serializeWatchlistItemMutation(item: WatchlistItemRecord) {
  return {
    watchlist_item_id: item.id,
    ticker: item.ticker,
    tags: serializeTags(item.tagsJson),
  };
}

watchlistRouter.use(requireAuth);

watchlistRouter.get("/", async (req, res, next) => {
  try {
    const query = listWatchlistQuerySchema.safeParse(req.query);

    if (!query.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(query.error),
      });
    }

    const where = { userId: req.auth!.userId };
    const { page, page_size: pageSize } = query.data;
    const { skip, take } = getPaginationParams({ page, pageSize });

    const [items, totalItems] = await Promise.all([
      prisma.watchlistItem.findMany({
        where,
        orderBy: [{ ticker: "asc" }, { createdAt: "asc" }],
        skip,
        take,
      }),
      prisma.watchlistItem.count({ where }),
    ]);

    res.status(200).json({
      data: {
        items: items.map(serializeWatchlistItem),
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

export const createWatchlistItemHandler: express.RequestHandler = async (req, res, next) => {
  try {
    const result = createWatchlistItemSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const ticker = normalizeTicker(result.data.ticker);
    const tags = normalizeTags(result.data.tags);

    const tickerError = validateTicker(ticker);
    const tagsError = validateTags(tags);

    if (tickerError || tagsError) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: {
          ...(tickerError ? { ticker: tickerError } : {}),
          ...(tagsError ? { tags: tagsError } : {}),
        },
      });
    }

    const item = await prisma.watchlistItem.create({
      data: {
        userId: req.auth!.userId,
        ticker,
        tagsJson: tags,
      },
    });

    res.status(200).json({
      data: serializeWatchlistItemMutation(item),
      message: "Added to watchlist.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      next(
        new ApiError(409, {
          message: "That ticker is already in your watchlist.",
          conflict_type: "duplicate",
        }),
      );
      return;
    }

    next(error);
  }
};

watchlistRouter.post("/", createWatchlistLimiter, createWatchlistItemHandler);

watchlistRouter.put("/:watchlist_item_id", async (req, res, next) => {
  try {
    assertWatchlistId(req.params.watchlist_item_id);

    const result = updateWatchlistItemSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: getFieldErrors(result.error),
      });
    }

    const tags = normalizeTags(result.data.tags);
    const tagsError = validateTags(tags);

    if (tagsError) {
      throw new ApiError(422, {
        message: "Validation failed.",
        field_errors: { tags: tagsError },
      });
    }

    const existingItem = await prisma.watchlistItem.findFirst({
      where: {
        id: req.params.watchlist_item_id,
        userId: req.auth!.userId,
      },
    });

    if (!existingItem) {
      throw new ApiError(404, { message: "Not found." });
    }

    const item = await prisma.watchlistItem.update({
      where: { id: existingItem.id },
      data: { tagsJson: tags },
    });

    res.status(200).json({
      data: serializeWatchlistItemMutation(item),
    });
  } catch (error) {
    next(error);
  }
});

watchlistRouter.delete("/:watchlist_item_id", async (req, res, next) => {
  try {
    assertWatchlistId(req.params.watchlist_item_id);

    const result = await prisma.watchlistItem.deleteMany({
      where: {
        id: req.params.watchlist_item_id,
        userId: req.auth!.userId,
      },
    });

    if (result.count === 0) {
      throw new ApiError(404, { message: "Not found." });
    }

    res.status(200).json({
      data: { ok: true },
      message: "Deleted.",
    });
  } catch (error) {
    next(error);
  }
});

export { watchlistRouter };
