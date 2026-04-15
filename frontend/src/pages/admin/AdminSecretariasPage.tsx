import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { mergeSecretarias, SECRETARIAS } from '../../lib/secretarias';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

function estadoUsoBadge(estado: string) {
  const styles =
    estado === 'en_uso'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-rose-100 text-rose-700 border-rose-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>
      {estado === 'en_uso' ? 'En Uso' : 'En Almacén'}
    </span>
  );
}

function estatusBadge(estatus: string) {
  const styles =
    estatus === 'activo'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : estatus === 'en_mantenimiento'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>
      {estatus === 'activo' ? 'Activo' : estatus === 'en_mantenimiento' ? 'Mantenimiento' : 'Baja'}
    </span>
  );
}

export default function AdminSecretariasPage() {
  const { token } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [secretarias, setSecretarias] = useState<string[]>([...SECRETARIAS]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<string>('');
  const [q, setQ] = useState('');

  async function reload(next?: { secretaria?: string }) {
    if (!token) return;
    const secretaria = next?.secretaria ?? selected;
    setLoading(true);
    const [sec, inv] = await Promise.all([
      api.secretarias(token),
      secretaria
        ? api.inventarioQuery(token, {
            secretaria,
            estado_uso: 'en_uso',
            limit: 100,
            page: 1,
            search: q.trim() || undefined
          })
        : Promise.resolve({ success: true, data: [] as InventoryItem[] })
    ]);
    setLoading(false);

    if (!sec.success) toast.push({ type: 'error', title: 'No se pudieron cargar secretarías', detail: (sec as any).message });
    if (!inv.success) toast.push({ type: 'error', title: 'No se pudo cargar inventario', detail: (inv as any).message });

    const merged = mergeSecretarias([...SECRETARIAS], sec.data || []);
    setSecretarias(merged);

    const finalSelected = secretaria || merged[0] || '';
    if (!selected && finalSelected) setSelected(finalSelected);

    setItems(inv.data || []);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !selected) return;
    reload({ secretaria: selected });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Secretarías</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => reload()} disabled={loading}>
                Recargar
              </Button>
              <Button onClick={() => nav('/admin/articulos/nuevo')}>Agregar artículo</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-mutedForeground">Secretaría</label>
                <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">Seleccione…</option>
                  {secretarias.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-mutedForeground">Buscar</label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Inventario, nombre, resguardante…" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => reload()} disabled={loading || !selected}>
                Buscar
              </Button>
            </div>

            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs text-mutedForeground">
                  <tr>
                    <th className="px-3 py-2">Inventario</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2">Estado Uso</th>
                    <th className="px-3 py-2">Estatus</th>
                    <th className="px-3 py-2">Resguardante</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{i.numero_inventario}</td>
                      <td className="px-3 py-2">{i.nombre_articulo}</td>
                      <td className="px-3 py-2">
                        {i.categoria || '—'}
                        {i.subcategoria && <span className="text-mutedForeground"> · {i.subcategoria}</span>}
                      </td>
                      <td className="px-3 py-2">{estadoUsoBadge(i.estado_uso)}</td>
                      <td className="px-3 py-2">{estatusBadge(i.estatus)}</td>
                      <td className="px-3 py-2">{i.resguardante}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => nav(`/admin/articulos/${i.id}`)}>
                            Ver
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => nav(`/admin/articulos/${i.id}/editar`)}>
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm text-mutedForeground" colSpan={7}>
                        {loading ? 'Cargando…' : selected ? 'Sin artículos en esta secretaría.' : 'Selecciona una secretaría.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-mutedForeground">Mostrando: {items.length}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

