import { z } from "zod";

export const defaultPageSize = 10;
export const maxPageSize = 50;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(maxPageSize).default(defaultPageSize),
});

export function buildPaginationMeta({
  page,
  pageSize,
  totalItems,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
}) {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

  return {
    page,
    page_size: pageSize,
    total_items: totalItems,
    total_pages: totalPages,
    has_next: totalPages > 0 && page < totalPages,
    has_prev: page > 1 && totalPages > 0,
  };
}

export function getPaginationParams({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
