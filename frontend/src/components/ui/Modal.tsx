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
    <div className="fixed inset-0 z-40 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-end justify-center sm:items-center p-0 sm:p-4">
        <div className={cn(
          'w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl border bg-white/90 shadow-ios-xl backdrop-blur-xl max-h-[90vh] sm:max-h-none flex flex-col animate-in slide-in-from-bottom-4 duration-300',
          'dark:bg-black/60 dark:border-white/10',
          className
        )}>
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 flex-shrink-0">
            <div className="text-sm font-semibold pr-4">{title}</div>
            <button
              className="rounded-full p-2 text-mutedForeground hover:bg-muted/80 hover:text-foreground flex-shrink-0 transition-colors"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

