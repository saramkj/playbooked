import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-[hsl(var(--card))] p-5 md:p-6 rounded-lg border border-[hsl(var(--border))] ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
