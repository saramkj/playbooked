import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import { listTemplates, type Template } from '../lib/templates';
import { useSession } from '../session/useSession';

export function TemplatesPage() {
  const { refreshSession } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const response = await listTemplates();
      setTemplates(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load templates.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  if (isLoading) {
    return <LoadingState label="Loading templates..." />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Templates</p>
        <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">Read-only templates</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Templates stay checklist-only in MVP. Review them here first, then choose one from an event
          detail page when you create the event’s single playbook.
        </p>
      </section>

      {pageError ? <ErrorBanner message={pageError} /> : null}

      {templates.length > 0 ? (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.template_id} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {template.template_type}
                  </p>
                  <h2 className="text-xl font-semibold text-stone-900 sm:text-2xl">{template.name}</h2>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
                  v{template.version}
                </span>
              </div>
              <ul className="space-y-3">
                {template.checklist_items.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-stone-200 px-4 py-3">
                    <p className="font-medium text-stone-900">{item.label}</p>
                    {item.help_text ? <p className="mt-1 text-sm text-stone-600">{item.help_text}</p> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates available."
          description="Playbook creation stays blocked until at least one checklist template exists."
          action={<p className="text-sm text-stone-500">Once templates are seeded, they will show up here automatically.</p>}
        />
      )}
    </div>
  );
}
