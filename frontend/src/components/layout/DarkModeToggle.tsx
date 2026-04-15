import Button from '../ui/Button';
import { storage, type StoredTheme } from '../../lib/storage';
import { applyTheme } from '../../lib/theme';
import { useEffect, useState } from 'react';

function Icon({ mode }: { mode: StoredTheme }) {
  if (mode === 'dark')
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    );
  if (mode === 'light')
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
      <path d="M4 12a8 8 0 0014.93 4" />
    </svg>
  );
}

export default function DarkModeToggle() {
  const [mode, setMode] = useState<StoredTheme>(() => storage.getTheme());

  useEffect(() => {
    applyTheme(mode);
    storage.setTheme(mode);
  }, [mode]);

  return (
    <Button
      variant="ghost"
      className="h-9 px-2"
      title="Cambiar tema"
      onClick={() => setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'))}
    >
      <Icon mode={mode} />
      <span className="hidden text-xs text-mutedForeground md:inline">
        {mode === 'system' ? 'Sistema' : mode === 'dark' ? 'Oscuro' : 'Claro'}
      </span>
    </Button>
  );
}

