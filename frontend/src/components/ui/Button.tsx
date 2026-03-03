import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'border-blue-500/80 bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-400',
    secondary:
      'border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-400',
    danger:
      'border-rose-500/80 bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-400',
    ghost:
      'border-transparent bg-transparent text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/70 focus:ring-zinc-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
