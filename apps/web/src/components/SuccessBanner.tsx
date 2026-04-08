type SuccessBannerProps = {
  title?: string;
  message: string;
};

export function SuccessBanner({ message, title = 'Saved successfully' }: SuccessBannerProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-[hsl(var(--success)/0.2)] bg-[hsl(var(--success)/0.1)] px-4 py-3 text-sm text-[hsl(var(--foreground))]"
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-[hsl(var(--success))]">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.25" />
          <path d="m5.25 8.25 1.75 1.75 3.75-4.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-[hsl(var(--muted-foreground))]">{message}</p>
      </div>
    </div>
  );
}
