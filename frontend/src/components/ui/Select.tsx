import React from 'react';
import { cn } from '../../lib/cn';

export default function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border bg-card px-3 text-sm outline-none transition focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/15',
        className
      )}
      {...props}
    />
  );
}
