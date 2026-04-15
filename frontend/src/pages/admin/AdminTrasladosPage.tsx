import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { mergeSecretarias, SECRETARIAS } from '../../lib/secretarias';

export default function AdminTrasladosPage() {
  const { token } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [secretarias, setSecretarias] = useState<string[]>([...SECRETARIAS]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!token) return;
    setLoading(true);
    const [inv, sec] = await Promise.all([api.inventario(token), api.secretarias(token)]);
    setLoading(false);
    if (inv.success && inv.data) setItems(inv.data);
    if (sec.success && sec.data) setSecretarias(mergeSecretarias([...SECRETARIAS], sec.data));
    if (!inv.success) toast.push({ type: 'error', title: 'No se pudo cargar inventario', detail: inv.message });
    if (!sec.success) toast.push({ type: 'error', title: 'No se pudieron cargar secretarías', detail: sec.message });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const candidates = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items.slice(0, 25);
    return items
      .filter((i) => [i.numero_inventario, i.nombre_articulo, i.secretaria].join(' ').toLowerCase().includes(s))
      .slice(0, 25);
  }, [items, search]);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  async function submit() {
    if (!token || !selected) return;
    if (!destino.trim()) {
      toast.push({ type: 'error', title: 'Secretaría destino requerida' });
      return;
    }
    setBusy(true);
    const res = await api.trasladarInventario(token, selected.id, {
      secretaria_destino: destino.trim(),
      motivo_traslado: motivo.trim() || undefined
    });
    setBusy(false);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo trasladar', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: 'Traslado realizado', detail: `${selected.secretaria} → ${destino}` });
    setDestino('');
    setMotivo('');
    setSelectedId(null);
    setSearch('');
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Traslado entre secretarías</CardTitle>
            <Button variant="secondary" onClick={reload} disabled={loading}>
              Recargar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-mutedForeground">Buscar artículo (máx 25 resultados)</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="INV-001, nombre, secretaría…" />
              <Select value={selectedId ? String(selectedId) : ''} onChange={(e) => setSelectedId(Number(e.target.value) || null)}>
                <option value="">Seleccione…</option>
                {candidates.map((i) => (
                  <option key={i.id} value={String(i.id)}>
                    {i.numero_inventario} · {i.nombre_articulo} · {i.secretaria}
                  </option>
                ))}
              </Select>
              {selected ? (
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <div className="font-semibold">{selected.numero_inventario}</div>
                  <div className="text-xs text-mutedForeground">{selected.nombre_articulo}</div>
                  <div className="mt-1 text-xs text-mutedForeground">Origen: {selected.secretaria}</div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-mutedForeground">Secretaría destino</label>
              <Select value={destino} onChange={(e) => setDestino(e.target.value)}>
                <option value="">Seleccione…</option>
                {secretarias.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <label className="text-xs font-medium text-mutedForeground">Motivo (opcional)</label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Reasignación por cambio de área" />

              <div className="mt-2 flex gap-2">
                <Button onClick={submit} disabled={!selected || busy}>
                  {busy ? 'Trasladando…' : 'Trasladar'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDestino('');
                    setMotivo('');
                    setSelectedId(null);
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
