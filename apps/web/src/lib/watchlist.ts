import { apiFetch } from './api';

export type WatchlistItem = {
  watchlist_item_id: string;
  ticker: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type WatchlistListResponse = {
  data: WatchlistItem[];
};

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

export async function listWatchlistItems() {
  return apiFetch<WatchlistListResponse>('/api/watchlist_items');
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
