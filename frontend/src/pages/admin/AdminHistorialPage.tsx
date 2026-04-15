import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { HistorialItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const TIPOS = [
  '',
  'creacion_usuario',
  'registro_mueble',
  'traslado_mueble',
  'modificacion_mueble',
  'eliminacion_mueble',
  'login',
  'logout',
  'activacion_usuario',
  'desactivacion_usuario'
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
                  <option key={t || 'all'} value={t}>
                    {t ? t : 'Todos'}
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
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Destino</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(i.fecha_accion).toLocaleString('es-MX')}</td>
                    <td className="px-3 py-2">{i.tipo_accion}</td>
                    <td className="px-3 py-2">{i.descripcion}</td>
                    <td className="px-3 py-2">{i.secretaria_origen || '—'}</td>
                    <td className="px-3 py-2">{i.secretaria_destino || '—'}</td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-sm text-mutedForeground" colSpan={5}>
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

