import React from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-60',
        size === 'md' ? 'h-10 px-3' : 'h-9 px-2.5 text-xs',
        variant === 'primary' && 'border-transparent bg-primary text-primaryForeground hover:opacity-90',
        variant === 'secondary' && 'border-border bg-card text-foreground hover:bg-muted',
        variant === 'danger' && 'border-transparent bg-danger text-dangerForeground hover:opacity-90',
        variant === 'ghost' && 'border-transparent bg-transparent hover:bg-muted',
        className
      )}
      {...props}
    />
  );
}
