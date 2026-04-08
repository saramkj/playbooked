import { Button } from './Button';

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
};

export function PaginationControls({
  page,
  totalPages,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <Button
        className="w-9 px-0"
        disabled={!hasPrev}
        variant="ghost"
        onClick={onPrev}
        aria-label="Previous page"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m9.75 3.5-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>
      <span
        aria-current="page"
        className="inline-flex h-8 min-w-[4.5rem] items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 text-sm font-medium text-[hsl(var(--foreground))]"
      >
        {page} / {totalPages}
      </span>
      <Button
        className="w-9 px-0"
        disabled={!hasNext}
        variant="ghost"
        onClick={onNext}
        aria-label="Next page"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m6.25 3.5 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        </Button>
    </nav>
  );
}
