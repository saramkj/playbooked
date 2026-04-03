import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { SuccessBanner } from '../components/SuccessBanner';
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
  const isReadOnlyTrade = trade?.status === 'closed' || trade?.status === 'cancelled';

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
    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Trade detail</p>
          <h1 className="text-4xl font-semibold text-stone-950">Trade detail</h1>
        </section>
        <ErrorBanner message={pageError} />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Trade detail</p>
          <h1 className="text-4xl font-semibold text-stone-950">Trade not found</h1>
        </section>
        <EmptyState
          title="Trade not found."
          description="This paper trade may have been removed or is no longer visible to your session."
        />
      </div>
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
          {successMessage ? <SuccessBanner message={successMessage} title="Trade updated" /> : null}
          {isReadOnlyTrade ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              {trade.status === 'closed'
                ? 'This trade is closed. You can review the saved plan and outcome details, but lifecycle actions are no longer available.'
                : 'This trade is cancelled. You can review the saved details, but lifecycle actions are no longer available.'}
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
                  aria-describedby={fieldErrors.entry_plan ? 'trade-entry-plan-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.entry_plan)}
                  className={`min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.entry_plan ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!isPlanEditable || isSavingPlan}
                  value={form.entry_plan}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, entry_plan: event.target.value }));
                    if (fieldErrors.entry_plan || actionError) {
                      setFieldErrors((current) => ({ ...current, entry_plan: '' }));
                      setActionError(null);
                    }
                  }}
                />
                {fieldErrors.entry_plan ? (
                  <p id="trade-entry-plan-error" className="text-sm font-medium text-rose-700">
                    Error: {fieldErrors.entry_plan}
                  </p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Stop rule</span>
                <textarea
                  aria-describedby={fieldErrors.stop_rule ? 'trade-stop-rule-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.stop_rule)}
                  className={`min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.stop_rule ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!isPlanEditable || isSavingPlan}
                  value={form.stop_rule}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, stop_rule: event.target.value }));
                    if (fieldErrors.stop_rule || actionError) {
                      setFieldErrors((current) => ({ ...current, stop_rule: '' }));
                      setActionError(null);
                    }
                  }}
                />
                {fieldErrors.stop_rule ? (
                  <p id="trade-stop-rule-error" className="text-sm font-medium text-rose-700">
                    Error: {fieldErrors.stop_rule}
                  </p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Take profit rule</span>
                <textarea
                  aria-describedby={fieldErrors.take_profit_rule ? 'trade-take-profit-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.take_profit_rule)}
                  className={`min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.take_profit_rule ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!isPlanEditable || isSavingPlan}
                  value={form.take_profit_rule}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, take_profit_rule: event.target.value }));
                    if (fieldErrors.take_profit_rule || actionError) {
                      setFieldErrors((current) => ({ ...current, take_profit_rule: '' }));
                      setActionError(null);
                    }
                  }}
                />
                {fieldErrors.take_profit_rule ? (
                  <p id="trade-take-profit-error" className="text-sm font-medium text-rose-700">
                    Error: {fieldErrors.take_profit_rule}
                  </p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Position size</span>
                <input
                  aria-describedby={fieldErrors.position_size ? 'trade-position-size-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.position_size)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.position_size ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!isPlanEditable || isSavingPlan}
                  min="0"
                  step="0.0001"
                  type="number"
                  value={form.position_size}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, position_size: event.target.value }));
                    if (fieldErrors.position_size || actionError) {
                      setFieldErrors((current) => ({ ...current, position_size: '' }));
                      setActionError(null);
                    }
                  }}
                />
                {fieldErrors.position_size ? (
                  <p id="trade-position-size-error" className="text-sm font-medium text-rose-700">
                    Error: {fieldErrors.position_size}
                  </p>
                ) : null}
              </label>

              {isPlanEditable ? (
                <Button disabled={isSavingPlan} type="submit">
                  {isSavingPlan ? 'Saving plan...' : 'Save plan'}
                </Button>
              ) : null}
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

            {canOpen ? (
              <div className="flex flex-wrap gap-3">
                <Button disabled={isOpening} onClick={() => setShowOpenConfirm(true)}>
                  Mark OPEN
                </Button>
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                {trade.status === 'open'
                  ? 'This trade is already open.'
                  : 'Mark OPEN is only available while the trade is still planned.'}
              </p>
            )}

            <form className="space-y-4 rounded-2xl border border-stone-200 p-4" onSubmit={(event) => void handleCloseTrade(event)}>
              <h3 className="text-lg font-semibold text-stone-900">Close trade</h3>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">P/L percent</span>
                <input
                  aria-describedby={fieldErrors.pnl_percent ? 'trade-pnl-percent-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.pnl_percent)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.pnl_percent ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!canClose || isClosing}
                  min="-100"
                  max="1000"
                  step="0.01"
                  type="number"
                  value={form.pnl_percent}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, pnl_percent: event.target.value }));
                    if (fieldErrors.pnl_percent || actionError) {
                      setFieldErrors((current) => ({ ...current, pnl_percent: '' }));
                      setActionError(null);
                    }
                  }}
                />
                {fieldErrors.pnl_percent ? (
                  <p id="trade-pnl-percent-error" className="text-sm font-medium text-rose-700">
                    Error: {fieldErrors.pnl_percent}
                  </p>
                ) : null}
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

              {canClose ? (
                <Button disabled={isClosing} type="submit" variant="secondary">
                  {isClosing ? 'Closing...' : 'Close trade'}
                </Button>
              ) : (
                <p className="text-sm text-stone-500">Close is only available after the trade is open.</p>
              )}
            </form>

            <div className="space-y-4 rounded-2xl border border-stone-200 p-4">
              <h3 className="text-lg font-semibold text-stone-900">Cancel trade</h3>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-800">Cancel reason</span>
                <textarea
                  aria-describedby={fieldErrors.cancel_reason ? 'trade-cancel-reason-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.cancel_reason)}
                  className={`min-h-24 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.cancel_reason ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                  }`}
                  disabled={!canCancel || isCancelling}
                  value={form.cancel_reason}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, cancel_reason: event.target.value }));
                    if (fieldErrors.cancel_reason || actionError) {
                      setFieldErrors((current) => ({ ...current, cancel_reason: '' }));
                      setActionError(null);
                    }
                  }}
                />
                {fieldErrors.cancel_reason ? (
                  <p id="trade-cancel-reason-error" className="text-sm font-medium text-rose-700">
                    Error: {fieldErrors.cancel_reason}
                  </p>
                ) : null}
              </label>
              {canCancel ? (
                <Button disabled={isCancelling} variant="ghost" onClick={() => void handleCancelTrade()}>
                  {isCancelling ? 'Cancelling...' : 'Cancel trade'}
                </Button>
              ) : (
                <p className="text-sm text-stone-500">Cancel is only available while the trade is planned or open.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
