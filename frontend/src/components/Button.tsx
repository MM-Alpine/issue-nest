import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800',
  secondary:
    'bg-white text-slate-700 border border-slate-300 shadow-sm hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800',
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
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-[background-color,border-color,box-shadow,color] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
