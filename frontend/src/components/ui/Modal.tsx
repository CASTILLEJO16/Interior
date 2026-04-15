import React, { useEffect } from 'react';
import { cn } from '../../lib/cn';

export default function Modal({
  open,
  title,
  children,
  onClose,
  className
}: {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cn('w-full max-w-2xl rounded-lg border bg-card shadow-soft', className)}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold">{title}</div>
            <button
              className="rounded-md p-1 text-mutedForeground hover:bg-muted hover:text-foreground"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="max-h-[75vh] overflow-auto p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

