import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ error, hint, id, label, className = '', ...props }: InputProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</span>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`flex h-10 w-full rounded-md border bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-40 ${
          error ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--input))]'
        } ${className}`.trim()}
        {...props}
      />
      {hint ? <p id={`${id}-hint`} className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="text-xs text-[hsl(var(--destructive))]">Error: {error}</p> : null}
    </label>
  );
}
