import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { getButtonClassName, type ButtonVariant } from './buttonStyles';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({
  children,
  className = '',
  fullWidth = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={getButtonClassName({ className, fullWidth, variant })}
      {...props}
    >
      {children}
    </button>
  );
}
