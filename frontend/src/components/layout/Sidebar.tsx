import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useAuth } from '../../state/auth';

type NavItem = { to: string; label: string; icon: React.ReactNode };

function Icon({ name }: { name: 'home' | 'box' | 'building' | 'file' | 'users' | 'history' | 'truck' | 'plus' }) {
  const common = 'h-4 w-4';
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12l9-9 9 9" />
          <path d="M9 21V9h6v12" />
        </svg>
      );
    case 'box':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4a2 2 0 001-1.73z" />
          <path d="M3.3 7L12 12l8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case 'building':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21V3h14v18" />
          <path d="M7 7h6M7 11h6M7 15h6" />
          <path d="M17 21v-8h4v8" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <path d="M9 11a4 4 0 100-8 4 4 0 000 8z" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case 'file':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case 'history':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9" />
          <path d="M3 3v6h6" />
          <path d="M12 7v5l4 2" />
        </svg>
      );
    case 'truck':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7h11v10H3z" />
          <path d="M14 10h4l3 3v4h-7z" />
          <path d="M7 17a2 2 0 100 4 2 2 0 000-4zM17 17a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
  }
}

function LinkItem({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-muted',
          isActive ? 'bg-muted font-semibold' : 'text-foreground'
        )
      }
      onClick={onNavigate}
      end
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items: NavItem[] =
    user?.rol === 'admin'
      ? [
          { to: '/admin', label: 'Inicio', icon: <Icon name="home" /> },
          { to: '/admin/almacen', label: 'Almacén', icon: <Icon name="box" /> },
          { to: '/admin/secretarias', label: 'Secretarías', icon: <Icon name="building" /> },
          { to: '/admin/articulos/nuevo', label: 'Agregar artículo', icon: <Icon name="plus" /> },
          { to: '/admin/usuarios', label: 'Usuarios', icon: <Icon name="users" /> },
          { to: '/admin/reportes', label: 'Reportes', icon: <Icon name="file" /> },
          { to: '/admin/historial', label: 'Historial', icon: <Icon name="history" /> },
          { to: '/admin/traslado', label: 'Traslado', icon: <Icon name="truck" /> }
        ]
      : [{ to: '/registro', label: 'Registro', icon: <Icon name="plus" /> }];

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="px-2 py-2">
        <div className="text-sm font-semibold">Inventario</div>
        <div className="text-xs text-mutedForeground">BDInterior</div>
      </div>
      <div className="flex flex-col gap-1">
        {items.map((i) => (
          <LinkItem key={i.to} item={i} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

