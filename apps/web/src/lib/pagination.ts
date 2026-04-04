export type PaginatedResponse<T> = {
  data: {
    items: T[];
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
};

export const defaultPageSize = 10;

export function buildPaginationQuery(page: number, pageSize = defaultPageSize) {
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('page_size', String(pageSize));
  return query;
}
