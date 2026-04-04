import { apiFetch } from './api';
import { buildPaginationQuery, type PaginatedResponse } from './pagination';

export type WatchlistItem = {
  watchlist_item_id: string;
  ticker: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type WatchlistListResponse = PaginatedResponse<WatchlistItem>;

type WatchlistMutationResponse = {
  data: {
    watchlist_item_id: string;
    ticker: string;
    tags: string[];
  };
  message?: string;
};

type DeleteWatchlistItemResponse = {
  data: {
    ok: true;
  };
  message: string;
};

export async function listWatchlistItems(page = 1) {
  const query = buildPaginationQuery(page);
  return apiFetch<WatchlistListResponse>(`/api/watchlist_items?${query.toString()}`);
}

export async function createWatchlistItem(input: { ticker: string; tags: string[] }) {
  return apiFetch<WatchlistMutationResponse>('/api/watchlist_items', {
    method: 'POST',
    body: input,
  });
}

export async function updateWatchlistItem(watchlistItemId: string, input: { tags: string[] }) {
  return apiFetch<WatchlistMutationResponse>(`/api/watchlist_items/${watchlistItemId}`, {
    method: 'PUT',
    body: input,
  });
}

export async function deleteWatchlistItem(watchlistItemId: string) {
  return apiFetch<DeleteWatchlistItemResponse>(`/api/watchlist_items/${watchlistItemId}`, {
    method: 'DELETE',
  });
}
