export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90',
  secondary:
    'border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--accent))]',
  ghost:
    'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/0.5)] hover:text-[hsl(var(--foreground))]',
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

  return `inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-sm font-medium text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:pointer-events-none disabled:opacity-40 ${variantClasses[variant]} ${widthClass} ${className}`.trim();
}
