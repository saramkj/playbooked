import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_16px_40px_-28px_rgba(28,25,23,0.45)] ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
