import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

function toCsv(items: InventoryItem[]) {
  const headers = [
    'id',
    'numero_inventario',
    'nombre_articulo',
    'categoria',
    'subcategoria',
    'secretaria',
    'estado_uso',
    'estatus',
    'fecha_alta',
    'costo',
    'resguardante',
    'descripcion'
  ];
  const lines = [headers.join(',')];
  for (const i of items) {
    const row = [
      i.id,
      i.numero_inventario,
      i.nombre_articulo,
      i.categoria || '',
      i.subcategoria || '',
      i.secretaria,
      i.estado_uso,
      i.estatus,
      i.fecha_alta,
      i.costo,
      i.resguardante,
      i.descripcion.replace(/\s+/g, ' ').trim()
    ].map((v) => `"${String(v).replaceAll('"', '""')}"`);
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export default function AdminReportesPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  async function reload() {
    if (!token) return;
    setLoading(true);
    const res = await api.inventario(token);
    setLoading(false);
    if (!res.success || !res.data) {
      toast.push({ type: 'error', title: 'No se pudo cargar inventario', detail: res.message });
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

  function download() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Reportes</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reload} disabled={loading}>
                Recargar
              </Button>
              <Button onClick={download} disabled={!filtered.length}>
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar antes de exportar…" />
            <div className="text-sm">
              Registros: <span className="font-semibold">{filtered.length}</span>
            </div>
            <div className="text-xs text-mutedForeground">
              Exporta a CSV desde el cliente. Si quieres reportes PDF/Excel del lado backend, se puede agregar un endpoint específico.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

