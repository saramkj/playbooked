import type { ReactNode } from 'react';
import { Card } from './Card';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <Card className="border-dashed bg-transparent p-6 text-center md:p-8">
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">{title}</h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{description}</p>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
