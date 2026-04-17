import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { HistorialItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { cn } from '../../lib/cn';
import { formatDateTijuana } from '../../lib/date';

function TipoBadge({ tipo }: { tipo: string }) {
  const styles: Record<string, string> = {
    creacion_usuario: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    registro_mueble: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    traslado_mueble: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    modificacion_mueble: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    eliminacion_mueble: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    cambio_estado_uso: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    login: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    logout: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    activacion_usuario: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    desactivacion_usuario: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    modificacion_usuario: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    eliminacion_usuario: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };

  const labels: Record<string, string> = {
    creacion_usuario: 'Usuario',
    registro_mueble: 'Registro',
    traslado_mueble: 'Traslado',
    modificacion_mueble: 'Modificación',
    eliminacion_mueble: 'Eliminación',
    cambio_estado_uso: 'Almacén ↔ Secretaría',
    login: 'Login',
    logout: 'Logout',
    activacion_usuario: 'Activación',
    desactivacion_usuario: 'Desactivación',
    modificacion_usuario: 'Mod. Usuario',
    eliminacion_usuario: 'Elim. Usuario'
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', styles[tipo] || 'bg-gray-100 text-gray-700')}>
      {labels[tipo] || tipo}
    </span>
  );
}

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'creacion_usuario', label: 'Creación de usuario' },
  { value: 'registro_mueble', label: 'Registro de mueble' },
  { value: 'traslado_mueble', label: 'Traslado de mueble' },
  { value: 'modificacion_mueble', label: 'Modificación de mueble' },
  { value: 'eliminacion_mueble', label: 'Eliminación de mueble' },
  { value: 'cambio_estado_uso', label: 'Cambio de estado (Almacén/Secretaría)' },
  { value: 'login', label: 'Inicio de sesión' },
  { value: 'logout', label: 'Cierre de sesión' },
  { value: 'activacion_usuario', label: 'Activación de usuario' },
  { value: 'desactivacion_usuario', label: 'Desactivación de usuario' },
  { value: 'modificacion_usuario', label: 'Modificación de usuario' },
  { value: 'eliminacion_usuario', label: 'Eliminación de usuario' }
];

export default function AdminHistorialPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [limite, setLimite] = useState(100);
  const [q, setQ] = useState('');

  async function reload() {
    if (!token) return;
    setLoading(true);
    const res = await api.historial(token, {
      tipo: tipo || undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined,
      limite
    });
    setLoading(false);
    if (!res.success || !res.data) {
      toast.push({ type: 'error', title: 'No se pudo cargar historial', detail: res.message });
      return;
    }
    setItems(res.data);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => JSON.stringify(i).toLowerCase().includes(s));
  }, [items, q]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Historial del sistema</CardTitle>
            <Button variant="secondary" onClick={reload} disabled={loading}>
              {loading ? 'Cargando…' : 'Aplicar filtros'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mutedForeground">Tipo</label>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mutedForeground">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mutedForeground">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mutedForeground">Límite</label>
              <Input value={String(limite)} onChange={(e) => setLimite(Number(e.target.value) || 100)} inputMode="numeric" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-mutedForeground">Buscar</label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Texto libre…" />
            </div>
          </div>

          <div className="mt-3 overflow-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs text-mutedForeground">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Destino</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDateTijuana(i.fecha_accion)}</td>
                    <td className="px-3 py-2">
                      <TipoBadge tipo={i.tipo_accion} />
                    </td>
                    <td className="px-3 py-2 max-w-md truncate" title={i.descripcion}>{i.descripcion}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{i.usuario_nombre || '—'}</td>
                    <td className="px-3 py-2">{i.secretaria_origen || '—'}</td>
                    <td className="px-3 py-2">{i.secretaria_destino || '—'}</td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-sm text-mutedForeground" colSpan={6}>
                      {loading ? 'Cargando…' : 'Sin eventos.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

