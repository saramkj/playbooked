import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Input } from '../components/Input';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import {
  createWatchlistItem,
  deleteWatchlistItem,
  listWatchlistItems,
  type WatchlistItem,
  updateWatchlistItem,
} from '../lib/watchlist';
import { useSession } from '../session/useSession';

export function WatchlistPage() {
  const { refreshSession } = useSession();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ticker, setTicker] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTagsInput, setEditingTagsInput] = useState('');
  const [editingError, setEditingError] = useState<string | null>(null);
  const [editingFieldError, setEditingFieldError] = useState<string | null>(null);
  const [isSavingItemId, setIsSavingItemId] = useState<string | null>(null);
  const [isDeletingItemId, setIsDeletingItemId] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  const hasItems = items.length > 0;

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        if (left.ticker === right.ticker) {
          return left.created_at.localeCompare(right.created_at);
        }

        return left.ticker.localeCompare(right.ticker);
      }),
    [items],
  );

  const loadWatchlist = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const response = await listWatchlistItems();
      setItems(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load your watchlist.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    void loadWatchlist();
  }, [loadWatchlist]);

  useEffect(() => {
    if (formError || fieldErrors.ticker || fieldErrors.tags) {
      errorSummaryRef.current?.focus();
    }
  }, [fieldErrors.tags, fieldErrors.ticker, formError]);

  function parseTags(rawValue: string) {
    if (!rawValue.trim()) {
      return [];
    }

    return rawValue.split(',').map((tag) => tag.trim());
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await createWatchlistItem({
        ticker,
        tags: parseTags(tagsInput),
      });

      setTicker('');
      setTagsInput('');
      await loadWatchlist();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setFormError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
        return;
      }

      setFormError('Unable to add the ticker right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(item: WatchlistItem) {
    setEditingItemId(item.watchlist_item_id);
    setEditingTagsInput(item.tags.join(', '));
    setEditingError(null);
    setEditingFieldError(null);
  }

  function cancelEditing() {
    setEditingItemId(null);
    setEditingTagsInput('');
    setEditingError(null);
    setEditingFieldError(null);
  }

  async function handleSaveTags(watchlistItemId: string) {
    setIsSavingItemId(watchlistItemId);
    setEditingError(null);
    setEditingFieldError(null);

    try {
      await updateWatchlistItem(watchlistItemId, {
        tags: parseTags(editingTagsInput),
      });

      cancelEditing();
      await loadWatchlist();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setEditingError(error.message);
        setEditingFieldError(error.fieldErrors?.tags ?? null);
        return;
      }

      setEditingError('Unable to update tags right now.');
    } finally {
      setIsSavingItemId(null);
    }
  }

  async function handleDelete(watchlistItemId: string) {
    setIsDeletingItemId(watchlistItemId);
    setPageError(null);

    try {
      await deleteWatchlistItem(watchlistItemId);
      setItems((currentItems) =>
        currentItems.filter((item) => item.watchlist_item_id !== watchlistItemId),
      );

      if (editingItemId === watchlistItemId) {
        cancelEditing();
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to delete this ticker right now.');
    } finally {
      setIsDeletingItemId(null);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading your watchlist..." />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Watchlist</p>
        <h1 className="text-4xl font-semibold text-stone-950">Track event candidates</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Add tickers you want to prepare around, organize them with tags, and jump straight into event
          creation when a catalyst is worth planning for.
        </p>
      </section>

      {pageError ? <ErrorBanner message={pageError} /> : null}

      <Card className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-stone-950">Add ticker</h2>
          <p className="text-sm leading-6 text-stone-600">
            Tickers are normalized to uppercase. Tags are optional, comma-separated, and capped at 10.
          </p>
        </div>

        {formError ? (
          <div ref={errorSummaryRef} tabIndex={-1} aria-live="assertive">
            <ErrorBanner message={formError} title="Couldn't add that ticker" />
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(event) => void handleCreateItem(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="ticker"
              label="Ticker"
              hint="Examples: AAPL, MSFT, BRK.B"
              placeholder="AAPL"
              value={ticker}
              error={fieldErrors.ticker}
              onChange={(event) => setTicker(event.target.value)}
            />
            <Input
              id="tags"
              label="Tags"
              hint="Comma-separated. Up to 10 tags, 20 characters each."
              placeholder="earnings, large-cap"
              value={tagsInput}
              error={fieldErrors.tags}
              onChange={(event) => setTagsInput(event.target.value)}
            />
          </div>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Adding...' : 'Add ticker'}
          </Button>
        </form>
      </Card>

      {hasItems ? (
        <div className="space-y-4">
          {sortedItems.map((item) => {
            const isEditing = editingItemId === item.watchlist_item_id;
            const isSaving = isSavingItemId === item.watchlist_item_id;
            const isDeleting = isDeletingItemId === item.watchlist_item_id;

            return (
              <Card key={item.watchlist_item_id} className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-stone-500">Ticker</p>
                    <h2 className="text-2xl font-semibold text-stone-900">{item.ticker}</h2>
                    <p className="text-sm text-stone-500">
                      Updated {new Date(item.updated_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link to={`/events/new?watchlist_item_id=${item.watchlist_item_id}`}>
                      <Button variant="secondary">Create event</Button>
                    </Link>
                    {!isEditing ? (
                      <Button
                        variant="ghost"
                        onClick={() => startEditing(item)}
                      >
                        Edit tags
                      </Button>
                    ) : null}
                    <Button
                      disabled={isDeleting}
                      variant="ghost"
                      onClick={() => void handleDelete(item.watchlist_item_id)}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-600">
                        Edit tags
                      </h3>
                      <p className="text-sm text-stone-600">
                        Leave blank to clear tags. Tags stay trimmed and stored exactly once per comma entry.
                      </p>
                    </div>

                    {editingError ? (
                      <ErrorBanner
                        message={editingError}
                        title="Couldn't update tags"
                      />
                    ) : null}

                    <Input
                      id={`tags-${item.watchlist_item_id}`}
                      label="Tags"
                      hint="Comma-separated. Up to 10 tags, 20 characters each."
                      placeholder="earnings, swing"
                      value={editingTagsInput}
                      error={editingFieldError ?? undefined}
                      onChange={(event) => setEditingTagsInput(event.target.value)}
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={isSaving}
                        onClick={() => void handleSaveTags(item.watchlist_item_id)}
                      >
                        {isSaving ? 'Saving...' : 'Save tags'}
                      </Button>
                      <Button
                        disabled={isSaving}
                        variant="secondary"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-600">Tags</p>
                    {item.tags.length > 0 ? (
                      <ul className="flex list-none flex-wrap gap-2 p-0 m-0" aria-label={`${item.ticker} tags`}>
                        {item.tags.map((tag) => (
                          <li
                            key={`${item.watchlist_item_id}-${tag}`}
                            className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-sm font-medium text-stone-700"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-stone-500">No tags yet.</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Your watchlist is empty."
          description="Add your first ticker to start organizing ideas and route into event creation."
        />
      )}
    </div>
  );
}
