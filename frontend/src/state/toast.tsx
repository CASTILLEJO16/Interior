import React, { createContext, useContext, useMemo, useState } from 'react';
import { cn } from '../lib/cn';

type ToastType = 'info' | 'success' | 'error';
type Toast = { id: string; type: ToastType; title: string; detail?: string };

type ToastContextValue = {
  push: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function Icon({ type }: { type: ToastType }) {
  if (type === 'success')
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-success" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  if (type === 'error')
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-danger" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4m0 4h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-mutedForeground" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16v-4m0-4h.01" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      push: (toast) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const next: Toast = { id, ...toast };
        setToasts((prev) => [next, ...prev].slice(0, 4));
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4500);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-lg border bg-card p-3 shadow-soft',
              t.type === 'error' && 'border-danger/40',
              t.type === 'success' && 'border-success/40'
            )}
          >
            <div className="flex items-start gap-2">
              <Icon type={t.type} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{t.title}</div>
                {t.detail ? <div className="mt-0.5 text-xs text-mutedForeground">{t.detail}</div> : null}
              </div>
              <button
                className="rounded-md p-1 text-mutedForeground hover:bg-muted hover:text-foreground"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

