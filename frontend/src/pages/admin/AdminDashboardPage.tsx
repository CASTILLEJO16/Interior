import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../state/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import type { Estadisticas } from '../../lib/types';
import { useToast } from '../../state/toast';

function fmtMoney(value: number | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!token) return;
      setLoading(true);
      const res = await api.estadisticas(token);
      setLoading(false);
      if (!active) return;
      if (!res.success || !res.data) {
        toast.push({ type: 'error', title: 'No se pudieron cargar estadísticas', detail: res.message });
        return;
      }
      setStats({
        generales: (res.data as any).generales || {},
        porSecretaria: (res.data as any).porSecretaria || []
      });
    }
    load();
    return () => {
      active = false;
    };
  }, [token, toast]);

  const top = useMemo(() => (stats?.porSecretaria || []).slice(0, 6), [stats]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats?.generales.total_articulos ?? (loading ? '…' : '—')}</div>
            <div className="text-xs text-mutedForeground">Artículos registrados</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats?.generales.articulos_activos ?? (loading ? '…' : '—')}</div>
            <div className="text-xs text-mutedForeground">En operación</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valor total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{fmtMoney(stats?.generales.valor_total_inventario)}</div>
            <div className="text-xs text-mutedForeground">Suma de costos</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Costo promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{fmtMoney(stats?.generales.costo_promedio)}</div>
            <div className="text-xs text-mutedForeground">Promedio</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Secretarías (Top por valor)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-mutedForeground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Secretaría</th>
                  <th className="py-2 pr-3">Artículos</th>
                  <th className="py-2 pr-3">Valor total</th>
                  <th className="py-2 pr-3">Costo promedio</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r: any) => (
                  <tr key={r.secretaria} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{r.secretaria || '—'}</td>
                    <td className="py-2 pr-3">{r.total_articulos}</td>
                    <td className="py-2 pr-3">{fmtMoney(r.valor_total)}</td>
                    <td className="py-2 pr-3">{fmtMoney(r.costo_promedio)}</td>
                  </tr>
                ))}
                {!top.length && !loading ? (
                  <tr>
                    <td className="py-3 text-sm text-mutedForeground" colSpan={4}>
                      Sin datos aún.
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

