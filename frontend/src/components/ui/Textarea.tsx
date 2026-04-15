import React from 'react';
import { cn } from '../../lib/cn';

export default function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border bg-card px-3 py-2 text-sm outline-none transition placeholder:text-mutedForeground/70 focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/15',
        className
      )}
      {...props}
    />
  );
}
