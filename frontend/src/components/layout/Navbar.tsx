import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/auth';
import DarkModeToggle from './DarkModeToggle';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { cn } from '../../lib/cn';

type MenuItem = { to: string; label: string; description?: string };

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function MenuLink({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition',
          isActive ? 'bg-muted text-foreground' : 'text-mutedForeground hover:bg-muted hover:text-foreground'
        )
      }
      end
    >
      {label}
    </NavLink>
  );
}

function Dropdown({ label, items, onNavigate }: { label: string; items: MenuItem[]; onNavigate?: () => void }) {
  return (
    <div className="relative group">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-mutedForeground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
      >
        {label}
        <Chevron />
      </button>
      <div className="invisible absolute left-0 top-full z-40 mt-2 w-72 translate-y-1 opacity-0 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="rounded-xl border bg-card p-2 shadow-soft">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn('block rounded-lg px-3 py-2 text-sm transition', isActive ? 'bg-muted' : 'hover:bg-muted')
              }
              end
            >
              <div className="font-medium">{i.label}</div>
              {i.description ? <div className="text-xs text-mutedForeground">{i.description}</div> : null}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileItem({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'block rounded-lg px-3 py-2 text-sm transition',
          isActive ? 'bg-muted font-semibold' : 'text-foreground hover:bg-muted'
        )
      }
      end
    >
      <div>{item.label}</div>
      {item.description ? <div className="text-xs text-mutedForeground">{item.description}</div> : null}
    </NavLink>
  );
}

export default function Navbar({
  mobileOpen,
  onToggleMobile,
  onCloseMobile
}: {
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
}) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isAdmin = user?.rol === 'admin';
  const homeHref = isAdmin ? '/admin' : '/registro';

  const inventarioItems: MenuItem[] = [
    { to: '/admin/almacen', label: 'Almacén', description: 'Tabla, QR, asignación y edición' },
    { to: '/admin/secretarias', label: 'Secretarías', description: 'Tablas por secretaría' },
    { to: '/admin/articulos/nuevo', label: 'Agregar artículo', description: 'Alta rápida de inventario' },
    { to: '/admin/traslado', label: 'Traslado', description: 'Mover entre secretarías' },
    { to: '/admin/traslados/ordenes', label: 'Órdenes de Traslado', description: 'Historial y reimpresión de folios' }
  ];

  const adminItems: MenuItem[] = [
    { to: '/admin/usuarios', label: 'Usuarios', description: 'Crear/editar/activar/desactivar' },
    { to: '/admin/historial', label: 'Historial', description: 'Auditoría con filtros' },
    { to: '/admin/reportes', label: 'Reportes', description: 'Exportar CSV' }
  ];

  const mobileAdminAll: MenuItem[] = [{ to: '/admin', label: 'Inicio' }, ...inventarioItems, ...adminItems];
  const mobileUserAll: MenuItem[] = [{ to: '/registro', label: 'Registro', description: 'Captura de artículos' }];

  function handleLogoutConfirm() {
    setConfirmOpen(false);
    onCloseMobile();
    logout();
    nav('/login', { replace: true });
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/20 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:border-white/10 dark:bg-black/50 dark:supports-[backdrop-filter]:bg-black/40">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-card hover:bg-muted md:hidden"
            aria-label="Abrir menú"
            onClick={onToggleMobile}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <NavLink to={homeHref} className="inline-flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-white/50 dark:hover:bg-white/10 transition-colors" end>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 bg-white/80 shadow-ios backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4a2 2 0 001-1.73z" />
                <path d="M3.3 7L12 12l8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-semibold leading-tight">Inventario</div>
              <div className="text-xs text-mutedForeground leading-tight">BDInterior</div>
            </div>
          </NavLink>

          <div className="hidden flex-1 items-center gap-1 md:flex">
            {isAdmin ? (
              <>
                <MenuLink to="/admin" label="Inicio" />
                <Dropdown label="Inventario" items={inventarioItems} />
                <Dropdown label="Administración" items={adminItems} />
              </>
            ) : (
              <MenuLink to="/registro" label="Registro" />
            )}
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
            <DarkModeToggle />
            <div className="hidden md:flex">
              <Button
                variant="secondary"
                className="h-9"
                onClick={() => setConfirmOpen(true)}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <div className="absolute inset-y-0 left-0 flex w-[320px] max-w-[85vw] flex-col border-r bg-card">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div>
                <div className="text-sm font-semibold">{user?.nombre_completo || user?.usuario}</div>
                <div className="text-xs text-mutedForeground">{isAdmin ? 'Administrador' : 'Usuario'}</div>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-muted"
                aria-label="Cerrar menú"
                onClick={onCloseMobile}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1 p-2">
              {(isAdmin ? mobileAdminAll : mobileUserAll).map((i) => (
                <MobileItem key={i.to} item={i} onClick={onCloseMobile} />
              ))}
            </div>

            <div className="mt-auto border-t p-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setConfirmOpen(true)}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal de confirmación de cierre de sesión */}
      <Modal
        open={confirmOpen}
        title="¿Cerrar sesión?"
        onClose={() => setConfirmOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-mutedForeground">
            Tu sesión se cerrará y serás redirigido a la pantalla de inicio de sesión.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleLogoutConfirm}>
              Sí, cerrar sesión
            </Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
