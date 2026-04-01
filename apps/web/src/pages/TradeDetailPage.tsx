import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import { formatLocalDateTimeWithOffset } from '../lib/events';
import { getPaperTrade, type PaperTradeDetail } from '../lib/trades';
import { useSession } from '../session/useSession';

export function TradeDetailPage() {
  const { trade_id } = useParams();
  const { refreshSession } = useSession();
  const [trade, setTrade] = useState<PaperTradeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTrade() {
      if (!trade_id) {
        setPageError('Trade not found.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError(null);

      try {
        const response = await getPaperTrade(trade_id);

        if (isMounted) {
          setTrade(response.data);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await refreshSession();
          return;
        }

        if (isMounted) {
          setPageError(error instanceof ApiError ? error.message : 'Unable to load this paper trade.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTrade();

    return () => {
      isMounted = false;
    };
  }, [refreshSession, trade_id]);

  if (isLoading) {
    return <LoadingState label="Loading paper trade..." />;
  }

  if (pageError) {
    return <ErrorBanner message={pageError} />;
  }

  if (!trade) {
    return (
      <EmptyState
        title="Trade not found."
        description="This paper trade may have been removed or is no longer visible to your session."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Trade detail</p>
        <h1 className="text-4xl font-semibold text-stone-950">{trade.ticker}</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          This is the real minimal planned-trade detail for the current stage. Planning fields and lifecycle transitions
          remain intentionally disabled until the next paper-trade stage.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Card className="space-y-3">
          <p className="text-sm text-stone-500">Ticker snapshot</p>
          <h2 className="text-3xl font-semibold text-stone-900">{trade.ticker}</h2>
          <p className="text-sm text-stone-600">Created: {formatLocalDateTimeWithOffset(trade.created_at)}</p>
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
            {trade.status}
          </span>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold text-stone-950">Plan fields placeholder</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-stone-500">Entry plan</p>
              <p className="text-sm text-stone-700">{trade.entry_plan || 'Not set yet.'}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Stop rule</p>
              <p className="text-sm text-stone-700">{trade.stop_rule || 'Not set yet.'}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Take profit rule</p>
              <p className="text-sm text-stone-700">{trade.take_profit_rule || 'Not set yet.'}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Position size</p>
              <p className="text-sm text-stone-700">{trade.position_size ?? 'Not set yet.'}</p>
            </div>
          </div>
          <ErrorBanner message="Opening, closing, cancelling, and plan editing are intentionally unavailable in this stage. This page is read-only until the next lifecycle step is implemented." />
          <div className="flex flex-wrap gap-3">
            <Button disabled>Mark OPEN</Button>
            <Button disabled variant="secondary">
              Close trade
            </Button>
            <Button disabled variant="ghost">
              Cancel trade
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
