import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import { formatLocalDateTimeWithOffset, getEventDetail, markEventCompleted, type EventDetailResponse } from '../lib/events';
import { buildGatePreview, createPlaybook, getPlaybook, parseKeyMetricsInput, savePlaybook, type Playbook } from '../lib/playbooks';
import { listTemplates, type Template } from '../lib/templates';
import { attemptPaperTrade } from '../lib/trades';
import { useSession } from '../session/useSession';

export function EventDetailPage() {
  const { refreshSession } = useSession();
  const { event_id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<EventDetailResponse['data'] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [playbookError, setPlaybookError] = useState<string | null>(null);
  const [playbookFieldErrors, setPlaybookFieldErrors] = useState<Record<string, string>>({});
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isCreatingPlaybook, setIsCreatingPlaybook] = useState(false);
  const [isSavingPlaybook, setIsSavingPlaybook] = useState(false);
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);
  const [tradeActionError, setTradeActionError] = useState<string | null>(null);
  const [gateAttemptErrors, setGateAttemptErrors] = useState<Array<{
    gate: 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
    passed: false;
    message: string;
  }>>([]);
  const [gateAttemptPassedCount, setGateAttemptPassedCount] = useState<number | null>(null);
  const [playbookForm, setPlaybookForm] = useState({
    thesis: '',
    keyMetricsInput: '',
    invalidationRule: '',
    maxLossPercent: '',
    checklistState: {} as Record<string, boolean>,
  });
  const playbookErrorRef = useRef<HTMLDivElement | null>(null);

  const loadEventDetail = useCallback(async () => {
    if (!event_id) {
      setPageError('Event not found.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const response = await getEventDetail(event_id);
      setDetail(response.data);
      setTradeActionError(null);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return null;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load this event.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [event_id, refreshSession]);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await listTemplates();
      setTemplates(response.data);
      setSelectedTemplateId((current) => current || response.data[0]?.template_id || '');
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return [];
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load templates.');
      return [];
    }
  }, [refreshSession]);

  const loadPlaybook = useCallback(async (playbookId: string) => {
    try {
      const response = await getPlaybook(playbookId);
      setPlaybook(response.data);
      setPlaybookForm({
        thesis: response.data.thesis,
        keyMetricsInput: response.data.key_metrics.join(', '),
        invalidationRule: response.data.invalidation_rule,
        maxLossPercent: response.data.max_loss_percent === null ? '' : String(response.data.max_loss_percent),
        checklistState: response.data.checklist_state,
      });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return null;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load this playbook.');
      return null;
    }
  }, [refreshSession]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      const [eventDetail] = await Promise.all([loadEventDetail(), loadTemplates()]);

      if (!isMounted || !eventDetail?.playbook_summary) {
        setPlaybook(null);
        return;
      }

      await loadPlaybook(eventDetail.playbook_summary.playbook_id);
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [loadEventDetail, loadPlaybook, loadTemplates]);

  useEffect(() => {
    if (playbookError || Object.keys(playbookFieldErrors).length > 0) {
      playbookErrorRef.current?.focus();
    }
  }, [playbookError, playbookFieldErrors]);

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplateId('');
      return;
    }

    setSelectedTemplateId((current) => {
      if (current && templates.some((template) => template.template_id === current)) {
        return current;
      }

      return templates[0]?.template_id ?? '';
    });
  }, [templates]);

  const formattedDateTime = useMemo(
    () => (detail ? formatLocalDateTimeWithOffset(detail.event.event_datetime_at) : ''),
    [detail],
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.template_id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const playbookTemplate = useMemo(() => {
    if (!playbook) {
      return null;
    }

    return templates.find((template) => template.template_id === playbook.template_id) ?? null;
  }, [playbook, templates]);

  const gatePreview = useMemo(() => {
    if (!playbook || !playbookTemplate) {
      return null;
    }

    return buildGatePreview(playbook, playbookTemplate.checklist_items);
  }, [playbook, playbookTemplate]);

  const gateFailuresByCode = useMemo(
    () => new Map(gateAttemptErrors.map((gateError) => [gateError.gate, gateError.message])),
    [gateAttemptErrors],
  );

  async function handleMarkCompleted() {
    if (!event_id) {
      return;
    }

    setIsMarkingCompleted(true);
    setActionError(null);

    try {
      await markEventCompleted(event_id);
      await loadEventDetail();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setActionError(error.message);
        return;
      }

      setActionError('Unable to mark this event as completed right now.');
    } finally {
      setIsMarkingCompleted(false);
    }
  }

  async function handleCreatePaperTrade() {
    if (!playbook) {
      setTradeActionError('Create a playbook first.');
      return;
    }

    setIsCreatingTrade(true);
    setTradeActionError(null);
    setGateAttemptErrors([]);
    setGateAttemptPassedCount(null);

    try {
      const response = await attemptPaperTrade(playbook.playbook_id);
      await loadEventDetail();
      navigate(response.redirect_url);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        if (error.status === 409 && error.conflictType === 'planned_trade_exists' && error.plannedTradeId) {
          setDetail((current) => (
            current
              ? {
                  ...current,
                  planned_trade_id: error.plannedTradeId ?? current.planned_trade_id,
                }
              : current
          ));
          setTradeActionError(error.message);
          return;
        }

        if (error.status === 422 && error.gateErrors) {
          setTradeActionError(error.message);
          setGateAttemptErrors(error.gateErrors);
          setGateAttemptPassedCount(error.passedGateCount ?? null);
          return;
        }

        setTradeActionError(error.message);
        return;
      }

      setTradeActionError('Unable to create this paper trade right now.');
    } finally {
      setIsCreatingTrade(false);
    }
  }

  async function handleCreatePlaybook() {
    const templateId = selectedTemplate?.template_id ?? '';

    if (!event_id || !templateId) {
      setPlaybookError('Choose a template to continue.');
      setPlaybookFieldErrors({ template_id: 'Choose a valid template.' });
      return;
    }

    setIsCreatingPlaybook(true);
    setPlaybookError(null);
    setPlaybookFieldErrors({});

    try {
      const response = await createPlaybook(event_id, templateId);
      const updatedDetail = await loadEventDetail();

      if (updatedDetail?.playbook_summary) {
        await loadPlaybook(response.data.playbook_id);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setPlaybookError(error.message);
        setPlaybookFieldErrors(error.fieldErrors ?? {});
        return;
      }

      setPlaybookError('Unable to create this playbook right now.');
    } finally {
      setIsCreatingPlaybook(false);
    }
  }

  function handleChecklistToggle(checklistItemId: string) {
    setPlaybookForm((current) => ({
      ...current,
      checklistState: {
        ...current.checklistState,
        [checklistItemId]: !current.checklistState[checklistItemId],
      },
    }));
  }

  function handlePlaybookInputChange(
    key: 'thesis' | 'keyMetricsInput' | 'invalidationRule' | 'maxLossPercent',
    value: string,
  ) {
    setPlaybookForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSavePlaybook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!playbook) {
      return;
    }

    setIsSavingPlaybook(true);
    setPlaybookError(null);
    setPlaybookFieldErrors({});

    try {
      await savePlaybook(playbook.playbook_id, {
        thesis: playbookForm.thesis,
        key_metrics: parseKeyMetricsInput(playbookForm.keyMetricsInput),
        invalidation_rule: playbookForm.invalidationRule,
        max_loss_percent:
          playbookForm.maxLossPercent.trim() === '' ? null : Number(playbookForm.maxLossPercent),
        checklist_state: playbookForm.checklistState,
      });

      await loadPlaybook(playbook.playbook_id);
      await loadEventDetail();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await refreshSession();
          return;
        }

        setPlaybookError(error.message);
        setPlaybookFieldErrors(error.fieldErrors ?? {});
        return;
      }

      setPlaybookError('Unable to save this playbook right now.');
    } finally {
      setIsSavingPlaybook(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading event detail..." />;
  }

  if (pageError) {
    return <ErrorBanner message={pageError} />;
  }

  if (!detail) {
    return (
      <EmptyState
        title="Event not found."
        description="This event may have been removed or is no longer visible to your session."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Event detail</p>
        <h1 className="text-4xl font-semibold text-stone-950">{detail.watchlist_item.ticker}</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          This page now uses the real event, playbook, and process-gate attempt flow. Trade lifecycle actions
          beyond planned creation remain intentionally stubbed for the next stage.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
        <Card className="space-y-4">
          <div>
            <p className="text-sm text-stone-500">Ticker</p>
            <p className="text-2xl font-semibold text-stone-900">{detail.watchlist_item.ticker}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-stone-500">Type</p>
              <p className="font-medium text-stone-900">{detail.event.event_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Datetime</p>
              <p className="font-medium text-stone-900">{formattedDateTime}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-stone-500">Status</p>
              <p className="font-medium text-stone-900">{detail.event.status}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Created</p>
              <p className="font-medium text-stone-900">
                {formatLocalDateTimeWithOffset(detail.event.created_at)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-stone-500">Tags</p>
            {detail.watchlist_item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detail.watchlist_item.tags.map((tag) => (
                  <span
                    key={`${detail.watchlist_item.watchlist_item_id}-${tag}`}
                    className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-sm font-medium text-stone-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No tags yet.</p>
            )}
          </div>
          {detail.event.notes ? (
            <div>
              <p className="text-sm text-stone-500">Notes</p>
              <p className="mt-1 text-sm leading-6 text-stone-700">{detail.event.notes}</p>
            </div>
          ) : null}
          {actionError ? <ErrorBanner message={actionError} title="Couldn't update the event" /> : null}
          <Button
            disabled={isMarkingCompleted || detail.event.status === 'completed'}
            variant="secondary"
            onClick={() => void handleMarkCompleted()}
          >
            {detail.event.status === 'completed'
              ? 'Already completed'
              : isMarkingCompleted
                ? 'Marking completed...'
                : 'Mark completed'}
          </Button>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">Playbook panel</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950">Template-backed playbook</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
                {playbook ? (playbook.is_locked ? 'Locked' : 'Editable') : 'Create one'}
              </span>
            </div>
            {playbookError ? (
              <div ref={playbookErrorRef} tabIndex={-1} aria-live="assertive">
                <ErrorBanner
                  message={playbookError}
                  title={playbook ? "Couldn't update the playbook" : "Couldn't create the playbook"}
                />
              </div>
            ) : null}
            {!playbook ? (
              templates.length === 0 ? (
                <ErrorBanner
                  title="No templates available"
                  message="Playbook creation is blocked until at least one checklist template exists."
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-stone-600">
                    This event does not have its 1:1 playbook yet. Choose a checklist template to start the draft.
                  </p>
                  <label className="block space-y-2" htmlFor="template-picker">
                    <span className="text-sm font-medium text-stone-800">Template</span>
                    <select
                      id="template-picker"
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:ring-2 focus:ring-amber-500 ${
                        playbookFieldErrors.template_id ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                      }`}
                      value={selectedTemplateId}
                      onChange={(currentEvent: ChangeEvent<HTMLSelectElement>) => {
                        setSelectedTemplateId(currentEvent.target.value);
                        setPlaybookError(null);
                        setPlaybookFieldErrors((current) => {
                          if (!current.template_id) {
                            return current;
                          }

                          const next = { ...current };
                          delete next.template_id;
                          return next;
                        });
                      }}
                    >
                      <option value="" disabled>
                        Select a template
                      </option>
                      {templates.map((template) => (
                        <option key={template.template_id} value={template.template_id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    {playbookFieldErrors.template_id ? (
                      <p className="text-sm text-rose-700">{playbookFieldErrors.template_id}</p>
                    ) : null}
                  </label>
                  {selectedTemplate ? (
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-sm font-semibold text-stone-700">{selectedTemplate.name}</p>
                      <ul className="mt-3 space-y-2">
                        {selectedTemplate.checklist_items.map((item) => (
                          <li key={item.id} className="text-sm text-stone-600">
                            <span className="font-medium text-stone-800">{item.label}</span>
                            {item.help_text ? <span className="block text-stone-500">{item.help_text}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <Button
                    disabled={isCreatingPlaybook || !selectedTemplate}
                    onClick={() => void handleCreatePlaybook()}
                  >
                    {isCreatingPlaybook ? 'Creating playbook...' : 'Create playbook'}
                  </Button>
                </div>
              )
            ) : (
              <form className="space-y-5" onSubmit={(event) => void handleSavePlaybook(event)}>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-stone-900">{playbook.template_name}</p>
                  <p className="text-sm text-stone-600">
                    Passed gates: {gatePreview?.passedGateCount ?? detail.playbook_summary?.passed_gate_count ?? 0}/5
                  </p>
                </div>

                {playbook.is_locked ? (
                  <ErrorBanner
                    title="Playbook locked"
                    message="Playbook locked because a trade is open."
                  />
                ) : null}

                <label className="block space-y-2" htmlFor="playbook-thesis">
                  <span className="text-sm font-medium text-stone-800">Thesis</span>
                  <textarea
                    id="playbook-thesis"
                    className={`min-h-36 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500 ${
                      playbookFieldErrors.thesis ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                    }`}
                    disabled={playbook.is_locked || isSavingPlaybook}
                    placeholder="Write the event thesis."
                    value={playbookForm.thesis}
                    onChange={(currentEvent) => handlePlaybookInputChange('thesis', currentEvent.target.value)}
                  />
                  {playbookFieldErrors.thesis ? <p className="text-sm text-rose-700">{playbookFieldErrors.thesis}</p> : null}
                </label>

                <label className="block space-y-2" htmlFor="playbook-key-metrics">
                  <span className="text-sm font-medium text-stone-800">Key metrics</span>
                  <input
                    id="playbook-key-metrics"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500 ${
                      playbookFieldErrors.key_metrics ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                    }`}
                    disabled={playbook.is_locked || isSavingPlaybook}
                    placeholder="Revenue growth, margins"
                    value={playbookForm.keyMetricsInput}
                    onChange={(currentEvent) => handlePlaybookInputChange('keyMetricsInput', currentEvent.target.value)}
                  />
                  <p className="text-sm text-stone-500">Comma-separated, up to 20 metrics.</p>
                  {playbookFieldErrors.key_metrics ? <p className="text-sm text-rose-700">{playbookFieldErrors.key_metrics}</p> : null}
                </label>

                <label className="block space-y-2" htmlFor="playbook-invalidation">
                  <span className="text-sm font-medium text-stone-800">Invalidation rule</span>
                  <textarea
                    id="playbook-invalidation"
                    className={`min-h-28 w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500 ${
                      playbookFieldErrors.invalidation_rule ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                    }`}
                    disabled={playbook.is_locked || isSavingPlaybook}
                    placeholder="State what makes this setup wrong."
                    value={playbookForm.invalidationRule}
                    onChange={(currentEvent) => handlePlaybookInputChange('invalidationRule', currentEvent.target.value)}
                  />
                  {playbookFieldErrors.invalidation_rule ? (
                    <p className="text-sm text-rose-700">{playbookFieldErrors.invalidation_rule}</p>
                  ) : null}
                </label>

                <label className="block space-y-2" htmlFor="playbook-max-loss">
                  <span className="text-sm font-medium text-stone-800">Max loss percent</span>
                  <input
                    id="playbook-max-loss"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500 ${
                      playbookFieldErrors.max_loss_percent ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
                    }`}
                    disabled={playbook.is_locked || isSavingPlaybook}
                    min="0"
                    step="0.01"
                    type="number"
                    value={playbookForm.maxLossPercent}
                    onChange={(currentEvent) => handlePlaybookInputChange('maxLossPercent', currentEvent.target.value)}
                  />
                  {playbookFieldErrors.max_loss_percent ? (
                    <p className="text-sm text-rose-700">{playbookFieldErrors.max_loss_percent}</p>
                  ) : null}
                </label>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-stone-800">Checklist</p>
                  {playbookTemplate?.checklist_items.map((item) => (
                    <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-stone-200 px-4 py-3">
                      <input
                        checked={playbookForm.checklistState[item.id] === true}
                        disabled={playbook.is_locked || isSavingPlaybook}
                        type="checkbox"
                        onChange={() => handleChecklistToggle(item.id)}
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-stone-900">{item.label}</span>
                        {item.help_text ? <span className="block text-sm text-stone-500">{item.help_text}</span> : null}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button disabled={playbook.is_locked || isSavingPlaybook} type="submit">
                    {isSavingPlaybook ? 'Saving...' : 'Save playbook'}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-stone-500">Process Gate preview</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950">
                  {gatePreview
                    ? `${gateAttemptPassedCount ?? gatePreview.passedGateCount}/5 gates passed`
                    : 'Complete a playbook to preview gates'}
                </h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                Preview only
              </span>
            </div>
            {gatePreview ? (
              <div className="space-y-3">
                {tradeActionError ? (
                  <ErrorBanner
                    title={detail.planned_trade_id ? 'Planned trade state updated' : 'Process Gate blocked'}
                    message={tradeActionError}
                  />
                ) : null}
                {gatePreview.gates.map((gate) => (
                  <div key={gate.gate} className="rounded-2xl border border-stone-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-stone-900">
                        {gate.gate} · {gate.label}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          gateFailuresByCode.has(gate.gate) || !gate.passed
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {gateFailuresByCode.has(gate.gate) || !gate.passed ? 'Fail' : 'Pass'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{gateFailuresByCode.get(gate.gate) ?? gate.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-stone-600">
                The playbook preview will show per-gate pass and fail states as soon as the event has a template-backed playbook.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {detail.planned_trade_id ? (
                <>
                  <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Planned trade already exists for this playbook.
                  </div>
                  <Link to={`/trades/${detail.planned_trade_id}`}>
                    <Button variant="secondary">View planned trade</Button>
                  </Link>
                </>
              ) : (
                <Button
                  disabled={!playbook || isCreatingTrade}
                  onClick={() => void handleCreatePaperTrade()}
                >
                  {isCreatingTrade ? 'Creating planned trade...' : 'Create Paper Trade'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
