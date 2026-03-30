import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ error, hint, id, label, className = '', ...props }: InputProps) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500 ${
          error ? 'border-rose-300 bg-rose-50' : 'border-stone-300 bg-white'
        } ${className}`.trim()}
        {...props}
      />
      {error ? <p id={messageId} className="text-sm text-rose-700">{error}</p> : null}
      {!error && hint ? <p id={messageId} className="text-sm text-stone-500">{hint}</p> : null}
    </label>
  );
}
