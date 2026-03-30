import type { ReactNode } from 'react';
import { Card } from './Card';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <Card className="border-dashed bg-stone-50">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Empty state</p>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
        </div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}
