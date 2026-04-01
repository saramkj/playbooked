import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import { formatLocalDateTimeWithOffset } from '../lib/events';
import {
  cancelPaperTrade,
  closePaperTrade,
  getPaperTrade,
  markPaperTradeOpen,
  savePaperTradePlan,
  type PaperTradeDetail,
  type TradeOutcome,
} from '../lib/trades';
import { useSession } from '../session/useSession';

type TradeFormState = {
  entry_plan: string;
  stop_rule: string;
  take_profit_rule: string;
  position_size: string;
  pnl_percent: string;
  outcome_notes: string;
  post_mortem_notes: string;
  cancel_reason: string;
};

const emptyTradeForm: TradeFormState = {
  entry_plan: '',
  stop_rule: '',
  take_profit_rule: '',
  position_size: '',
  pnl_percent: '',
  outcome_notes: '',
  post_mortem_notes: '',
  cancel_reason: '',
};

export function TradeDetailPage() {
  const { trade_id } = useParams();
  const { refreshSession } = useSession();
  const [trade, setTrade] = useState<PaperTradeDetail | null>(null);
  const [form, setForm] = useState<TradeFormState>(emptyTradeForm);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showOpenConfirm, setShowOpenConfirm] = useState(false);
  const [closeOutcome, setCloseOutcome] = useState<TradeOutcome | null>(null);

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
          setForm({
            entry_plan: response.data.entry_plan,
            stop_rule: response.data.stop_rule,
            take_profit_rule: response.data.take_profit_rule,
            position_size: response.data.position_size === null ? '' : String(response.data.position_size),
            pnl_percent: response.data.pnl_percent === null ? '' : String(response.data.pnl_percent),
            outcome_notes: response.data.outcome_notes,
            post_mortem_notes: response.data.post_mortem_notes,
            cancel_reason: response.data.cancel_reason ?? '',
          });
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

  const isPlanEditable = trade?.status === 'planned' || trade?.status === 'open';
  const canOpen = trade?.status === 'planned';
  const canClose = trade?.status === 'open';
  const canCancel = trade?.status === 'planned' || trade?.status === 'open';

  const closedOutcomeLabel = useMemo(() => {
    if (closeOutcome) {
      return closeOutcome;
    }

    if (!trade || trade.status !== 'closed' || trade.pnl_percent === null) {
      return null;
    }

    if (trade.pnl_percent > 0) {
      return 'win';
    }

    if (trade.pnl_percent < 0) {
      return 'loss';
    }

    return 'flat';
  }, [closeOutcome, trade]);

  function resetActionMessages() {
    setActionError(null);
    setFieldErrors({});
    setSuccessMessage(null);
  }

  async function reloadTrade() {
    if (!trade_id) {
      return;
    }

    const response = await getPaperTrade(trade_id);
    setTrade(response.data);
    setForm({
      entry_plan: response.data.entry_plan,
      stop_rule: response.data.stop_rule,
      take_profit_rule: response.data.take_profit_rule,
      position_size: response.data.position_size === null ? '' : String(response.data.position_size),
      pnl_percent: response.data.pnl_percent === null ? '' : String(response.data.pnl_percent),
      outcome_notes: response.data.outcome_notes,
      post_mortem_notes: response.data.post_mortem_notes,
      cancel_reason: response.data.cancel_reason ?? '',
    });
  }

  async function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trade) {
      return;
    }

    resetActionMessages();
    setIsSavingPlan(true);

    try {
      const response = await savePaperTradePlan(trade.paper_trade_id, {
        entry_plan: form.entry_plan,
        stop_rule: form.stop_rule,
        take_profit_rule: form.take_profit_rule,
        position_size: Number(form.position_size),
      });

      await reloadTrade();
      setSuccessMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setActionError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
        return;
      }

      setActionError('Unable to save the trade plan right now.');
    } finally {
      setIsSavingPlan(false);
    }
  }

  async function handleConfirmOpen() {
    if (!trade) {
      return;
    }

    resetActionMessages();
    setIsOpening(true);

    try {
      const response = await markPaperTradeOpen(trade.paper_trade_id);
      await reloadTrade();
      setSuccessMessage(response.message);
      setShowOpenConfirm(false);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setActionError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
        setShowOpenConfirm(false);
        return;
      }

      setActionError('Unable to open this trade right now.');
      setShowOpenConfirm(false);
    } finally {
      setIsOpening(false);
    }
  }

  async function handleCloseTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trade) {
      return;
    }

    resetActionMessages();
    setIsClosing(true);

    try {
      const response = await closePaperTrade(trade.paper_trade_id, {
        pnl_percent: Number(form.pnl_percent),
        outcome_notes: form.outcome_notes,
        post_mortem_notes: form.post_mortem_notes,
      });

      setCloseOutcome(response.data.outcome);
      await reloadTrade();
      setSuccessMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setActionError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
        return;
      }

      setActionError('Unable to close this trade right now.');
    } finally {
      setIsClosing(false);
    }
  }

  async function handleCancelTrade() {
    if (!trade) {
      return;
    }

    resetActionMessages();
    setIsCancelling(true);

    try {
      const response = await cancelPaperTrade(trade.paper_trade_id, form.cancel_reason);
      await reloadTrade();
      setSuccessMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setActionError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
        return;
      }

      setActionError('Unable to cancel this trade right now.');
    } finally {
      setIsCancelling(false);
    }
  }

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
          This page now runs the real paper-trade lifecycle for planned, open, closed, and cancelled states while
          keeping the rest of the MVP scope intact.
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
          {trade.opened_at ? (
            <p className="text-sm text-stone-600">Opened: {formatLocalDateTimeWithOffset(trade.opened_at)}</p>
          ) : null}
          {trade.closed_at ? (
            <p className="text-sm text-stone-600">Closed: {formatLocalDateTimeWithOffset(trade.closed_at)}</p>
          ) : null}
          {trade.cancelled_at ? (
            <p className="text-sm text-stone-600">Cancelled: {formatLocalDateTimeWithOffset(trade.cancelled_at)}</p>
          ) : null}
          {closedOutcomeLabel ? (
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-700">Outcome: {closedOutcomeLabel}</p>
          ) : null}
          <Link className="text-sm font-semibold text-amber-700 hover:text-amber-800" to={`/events`}>
            Back to events
          </Link>
        </Card>

        <div className="space-y-6">
          {actionError ? <ErrorBanner message={actionError} title="Trade action failed" /> : null}
          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {successMessage}
            </div>
          ) : null}

          <Card className="space-y-4">
            <div>
              <p className="text-sm text-stone-500">Plan fields</p>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">Entry, stop, take profit, position size</h2>
            </div>
            <form className="space-y-4" onSubmit={(event) => void handleSavePlan(event)}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Entry plan</span>
                <textarea
                  className={`min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.entry_plan ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!isPlanEditable || isSavingPlan}
                  value={form.entry_plan}
                  onChange={(event) => setForm((current) => ({ ...current, entry_plan: event.target.value }))}
                />
                {fieldErrors.entry_plan ? <p className="text-sm text-rose-700">{fieldErrors.entry_plan}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Stop rule</span>
                <textarea
                  className={`min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.stop_rule ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!isPlanEditable || isSavingPlan}
                  value={form.stop_rule}
                  onChange={(event) => setForm((current) => ({ ...current, stop_rule: event.target.value }))}
                />
                {fieldErrors.stop_rule ? <p className="text-sm text-rose-700">{fieldErrors.stop_rule}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Take profit rule</span>
                <textarea
                  className={`min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.take_profit_rule ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!isPlanEditable || isSavingPlan}
                  value={form.take_profit_rule}
                  onChange={(event) => setForm((current) => ({ ...current, take_profit_rule: event.target.value }))}
                />
                {fieldErrors.take_profit_rule ? <p className="text-sm text-rose-700">{fieldErrors.take_profit_rule}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Position size</span>
                <input
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.position_size ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!isPlanEditable || isSavingPlan}
                  min="0"
                  step="0.0001"
                  type="number"
                  value={form.position_size}
                  onChange={(event) => setForm((current) => ({ ...current, position_size: event.target.value }))}
                />
                {fieldErrors.position_size ? <p className="text-sm text-rose-700">{fieldErrors.position_size}</p> : null}
              </label>

              <Button disabled={!isPlanEditable || isSavingPlan} type="submit">
                {isSavingPlan ? 'Saving plan...' : 'Save plan'}
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm text-stone-500">Lifecycle actions</p>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">Open, close, and cancel</h2>
            </div>

            {showOpenConfirm ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Opening this trade locks your playbook. Continue?</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button disabled={isOpening} onClick={() => void handleConfirmOpen()}>
                    {isOpening ? 'Opening...' : 'Continue'}
                  </Button>
                  <Button disabled={isOpening} variant="ghost" onClick={() => setShowOpenConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button disabled={!canOpen || isOpening} onClick={() => setShowOpenConfirm(true)}>
                Mark OPEN
              </Button>
            </div>

            <form className="space-y-4 rounded-2xl border border-stone-200 p-4" onSubmit={(event) => void handleCloseTrade(event)}>
              <h3 className="text-lg font-semibold text-stone-900">Close trade</h3>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">P/L percent</span>
                <input
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.pnl_percent ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!canClose || isClosing}
                  min="-100"
                  max="1000"
                  step="0.01"
                  type="number"
                  value={form.pnl_percent}
                  onChange={(event) => setForm((current) => ({ ...current, pnl_percent: event.target.value }))}
                />
                {fieldErrors.pnl_percent ? <p className="text-sm text-rose-700">{fieldErrors.pnl_percent}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Outcome notes</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500"
                  disabled={!canClose || isClosing}
                  value={form.outcome_notes}
                  onChange={(event) => setForm((current) => ({ ...current, outcome_notes: event.target.value }))}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Post-mortem notes</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500"
                  disabled={!canClose || isClosing}
                  value={form.post_mortem_notes}
                  onChange={(event) => setForm((current) => ({ ...current, post_mortem_notes: event.target.value }))}
                />
              </label>

              <Button disabled={!canClose || isClosing} type="submit" variant="secondary">
                {isClosing ? 'Closing...' : 'Close trade'}
              </Button>
            </form>

            <div className="space-y-4 rounded-2xl border border-stone-200 p-4">
              <h3 className="text-lg font-semibold text-stone-900">Cancel trade</h3>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Cancel reason</span>
                <textarea
                  className={`min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.cancel_reason ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!canCancel || isCancelling}
                  value={form.cancel_reason}
                  onChange={(event) => setForm((current) => ({ ...current, cancel_reason: event.target.value }))}
                />
                {fieldErrors.cancel_reason ? <p className="text-sm text-rose-700">{fieldErrors.cancel_reason}</p> : null}
              </label>
              <Button disabled={!canCancel || isCancelling} variant="ghost" onClick={() => void handleCancelTrade()}>
                {isCancelling ? 'Cancelling...' : 'Cancel trade'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
