import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'danger',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Shows a spinner LEFT of unchanged label text, so the width never jumps. */
  pending?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  pending = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`button ${VARIANTS[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
