import { Card } from './Card';

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <Card>
      <div className="flex items-center gap-3 text-sm text-stone-600">
        <span className="h-3 w-3 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </Card>
  );
}
