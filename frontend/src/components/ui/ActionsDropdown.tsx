import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/cn';

type Action = {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'secondary';
};

export default function ActionsDropdown({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-muted"
      >
        Acciones
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border bg-card shadow-lg">
          <div className="py-1">
            {actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className={cn(
                  'block w-full px-3 py-2 text-left text-sm transition hover:bg-muted',
                  action.variant === 'danger' ? 'text-red-600 hover:text-red-700' : 'text-foreground'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
