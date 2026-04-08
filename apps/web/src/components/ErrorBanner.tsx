type ErrorBannerProps = {
  title?: string;
  message: string;
};

export function ErrorBanner({ message, title = 'Something needs attention' }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.1)] px-4 py-3 text-sm text-[hsl(var(--foreground))]"
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-[hsl(var(--destructive))]">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 4.5v4" strokeLinecap="round" />
          <path d="M8 11.25h.01" strokeLinecap="round" />
        </svg>
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-[hsl(var(--muted-foreground))]">{message}</p>
      </div>
    </div>
  );
}
