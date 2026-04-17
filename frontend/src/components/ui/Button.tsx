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
        'inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
        size === 'md' ? 'h-11 px-5' : 'h-9 px-3.5 text-xs rounded-lg',
        variant === 'primary' && 'border-transparent bg-primary text-primaryForeground shadow-ios hover:shadow-ios-lg hover:brightness-110',
        variant === 'secondary' && 'border-border/60 bg-white/80 text-foreground shadow-ios hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/10',
        variant === 'danger' && 'border-transparent bg-danger text-dangerForeground shadow-ios hover:shadow-ios-lg hover:brightness-110',
        variant === 'ghost' && 'border-transparent bg-transparent hover:bg-muted/80',
        className
      )}
      {...props}
    />
  );
}
