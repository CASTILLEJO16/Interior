import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { api } from '../lib/api';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import DarkModeToggle from '../components/layout/DarkModeToggle';
import { cn } from '../lib/cn';

export default function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'admin' | 'usuario'>('admin');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => usuario.trim().length >= 3 && contraseña.trim().length >= 6, [usuario, contraseña]);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    const res = await api.login({ usuario, contraseña, tipo_usuario: tipoUsuario });
    setLoading(false);

    if (!res.success || !res.token || !res.user) {
      toast.push({ type: 'error', title: 'No se pudo iniciar sesión', detail: res.message || 'Verifica tus credenciales' });
      return;
    }

    login({ token: res.token, user: res.user });
    toast.push({ type: 'success', title: 'Sesión iniciada', detail: 'Redirigiendo…' });
    nav(res.user.rol === 'admin' ? '/admin' : '/registro', { replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Fondo decorativo iOS */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-[20%] -top-[20%] h-[60%] w-[60%] rounded-full bg-blue-400/20 blur-[100px] dark:bg-blue-600/10" />
        <div className="absolute -bottom-[20%] -right-[20%] h-[60%] w-[60%] rounded-full bg-purple-400/20 blur-[100px] dark:bg-purple-600/10" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1100px] items-center justify-center px-4 py-10">
        <div className="absolute right-4 top-4">
          <DarkModeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-ios-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-mutedForeground">BDInterior</div>
                <div className="mt-1 text-xl font-semibold">Iniciar sesión</div>
                <div className="mt-1 text-sm text-mutedForeground">Accede al sistema de inventario.</div>
              </div>
              <div className="hidden h-10 w-10 items-center justify-center rounded-xl border bg-background md:flex">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4a2 2 0 001-1.73z" />
                  <path d="M3.3 7L12 12l8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>
            </div>

            <div className="mt-5">
              <div className="rounded-xl border bg-background p-1">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    className={cn(
                      'h-9 rounded-lg text-sm font-medium transition',
                      tipoUsuario === 'admin' ? 'bg-card shadow-soft' : 'text-mutedForeground hover:bg-muted'
                    )}
                    onClick={() => setTipoUsuario('admin')}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'h-9 rounded-lg text-sm font-medium transition',
                      tipoUsuario === 'usuario' ? 'bg-card shadow-soft' : 'text-mutedForeground hover:bg-muted'
                    )}
                    onClick={() => setTipoUsuario('usuario')}
                  >
                    Usuario
                  </button>
                </div>
              </div>
            </div>

            <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-mutedForeground" htmlFor="usuario">
                  Usuario
                </label>
                <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Tu usuario" autoFocus />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-mutedForeground" htmlFor="password">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    className="text-xs text-mutedForeground hover:text-foreground"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                <Input
                  id="password"
                  value={contraseña}
                  onChange={(e) => setContraseña(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" disabled={!canSubmit || loading} className="mt-1">
                {loading ? 'Ingresando…' : 'Ingresar'}
              </Button>

              <div className="text-xs text-mutedForeground">
                Al iniciar sesión aceptas el uso interno del sistema para gestión y auditoría.
              </div>
            </form>
          </div>

          <div className="mt-4 text-center text-xs text-mutedForeground">
            © {new Date().getFullYear()} BDInterior · Inventario
          </div>
        </div>
      </div>
    </div>
  );
}
