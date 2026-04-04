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
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-stone-600">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-3">
        <Button className="flex-1 justify-center sm:flex-none" disabled={!hasPrev} variant="secondary" onClick={onPrev}>
          Previous
        </Button>
        <Button className="flex-1 justify-center sm:flex-none" disabled={!hasNext} variant="secondary" onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
