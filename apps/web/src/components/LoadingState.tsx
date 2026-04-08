import { Card } from './Card';

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <Card>
      <div aria-label={label} className="space-y-3">
        <div className="skeleton-shimmer h-3 w-20 rounded-md" aria-hidden="true" />
        <div className="skeleton-shimmer h-5 w-48 rounded-md" aria-hidden="true" />
        <div className="skeleton-shimmer h-3 w-full max-w-xs rounded-md" aria-hidden="true" />
        <div className="pt-2">
          <div className="skeleton-shimmer h-8 w-full rounded-md" aria-hidden="true" />
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
      </div>
    </Card>
  );
}
