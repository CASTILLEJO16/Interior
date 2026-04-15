import React from 'react';
import { cn } from '../../lib/cn';

export default function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border bg-card px-3 text-sm outline-none transition placeholder:text-mutedForeground/70 focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/15',
        className
      )}
      {...props}
    />
  );
}
