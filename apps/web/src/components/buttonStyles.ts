export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-stone-950 text-stone-50 shadow-sm hover:bg-stone-800 disabled:bg-stone-300 disabled:text-stone-500',
  secondary:
    'border border-stone-300 bg-white text-stone-900 hover:border-stone-400 hover:bg-stone-50 disabled:border-stone-200 disabled:text-stone-400',
  ghost: 'text-stone-700 hover:bg-stone-100 disabled:text-stone-400',
};

export function getButtonClassName({
  className = '',
  fullWidth = false,
  variant = 'primary',
}: {
  className?: string;
  fullWidth?: boolean;
  variant?: ButtonVariant;
}) {
  const widthClass = fullWidth ? 'w-full justify-center' : '';

  return `inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed ${variantClasses[variant]} ${widthClass} ${className}`.trim();
}
