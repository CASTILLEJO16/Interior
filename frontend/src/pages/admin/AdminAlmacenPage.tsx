import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import InventoryForm, { type InventoryFormValues } from '../../components/inventory/InventoryForm';
import Select from '../../components/ui/Select';
import { SECRETARIAS } from '../../lib/secretarias';

function money(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
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

export default function AdminAlmacenPage() {
  const { token } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);
  const [moveSecretaria, setMoveSecretaria] = useState('');
  const [moveBusy, setMoveBusy] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);

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

  const almacen = useMemo(() => items.filter((i) => i.estado_uso === 'en_almacen' || i.secretaria === 'Almacén'), [items]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return almacen;
    return almacen.filter((i) =>
      [i.numero_inventario, i.nombre_articulo, i.descripcion, i.resguardante, i.categoria || '', i.subcategoria || '']
        .join(' ')
        .toLowerCase()
        .includes(s)
    );
  }, [almacen, q]);

  async function onDelete(item: InventoryItem) {
    if (!token) return;
    if (!confirm(`¿Eliminar ${item.numero_inventario}? Esta acción no se puede deshacer.`)) return;
    const res = await api.eliminarInventario(token, item.id);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo eliminar', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: 'Artículo eliminado' });
    reload();
  }

  async function onEditSubmit(values: InventoryFormValues) {
    if (!token || !editItem) return;
    setEditBusy(true);
    const form = new FormData();
    form.set('numero_inventario', values.numero_inventario);
    form.set('nombre_articulo', values.nombre_articulo);
    if (values.categoria) form.set('categoria', values.categoria);
    if (values.subcategoria) form.set('subcategoria', values.subcategoria);
    form.set('estado_uso', values.estado_uso);
    form.set('fecha_alta', values.fecha_alta);
    form.set('descripcion', values.descripcion);
    form.set('costo', values.costo);
    form.set('resguardante', values.resguardante);
    if (values.secretaria) form.set('secretaria', values.secretaria);
    if (values.estatus) form.set('estatus', values.estatus);
    if (values.imagen) form.set('imagen', values.imagen);

    const res = await api.actualizarInventario(token, editItem.id, form);
    setEditBusy(false);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo actualizar', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: 'Artículo actualizado' });
    setEditOpen(false);
    setEditItem(null);
    reload();
  }

  async function onMove() {
    if (!token || !moveItem) return;
    if (!moveSecretaria.trim()) {
      toast.push({ type: 'error', title: 'Secretaría requerida', detail: 'Especifica una secretaría destino.' });
      return;
    }
    setMoveBusy(true);
    const res = await api.moverInventario(token, moveItem.id, { estado_uso: 'en_uso', secretaria: moveSecretaria.trim() });
    setMoveBusy(false);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo mover', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: 'Movido a secretaría', detail: moveSecretaria });
    setMoveOpen(false);
    setMoveItem(null);
    setMoveSecretaria('');
    reload();
  }

  async function openQr(item: InventoryItem) {
    if (!token) return;
    setQrOpen(true);
    setQrItem(item);
    setQrImage(null);
    const res = await api.qrInventario(token, item.id);
    if (!res.success || !res.data?.qr_image) {
      toast.push({ type: 'error', title: 'No se pudo generar QR', detail: res.message });
      return;
    }
    setQrImage(res.data.qr_image);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Almacén</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => reload()} disabled={loading}>
                Recargar
              </Button>
              <Button onClick={() => nav('/admin/articulos/nuevo')}>Agregar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por inventario, nombre, resguardante…" />
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs text-mutedForeground">
                  <tr>
                    <th className="px-3 py-2">Inventario</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2">Costo</th>
                    <th className="px-3 py-2">Estatus</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{i.numero_inventario}</td>
                      <td className="px-3 py-2">{i.nombre_articulo}</td>
                      <td className="px-3 py-2">
                        {i.categoria || '—'} {i.subcategoria ? `· ${i.subcategoria}` : ''}
                      </td>
                      <td className="px-3 py-2">{money(i.costo)}</td>
                      <td className="px-3 py-2">{estatusBadge(i.estatus)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => nav(`/admin/articulos/${i.id}`)}>
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditItem(i);
                              setEditOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setMoveItem(i);
                              setMoveOpen(true);
                              setMoveSecretaria('');
                            }}
                          >
                            Asignar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openQr(i)}>
                            QR
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => onDelete(i)}>
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm text-mutedForeground" colSpan={6}>
                        {loading ? 'Cargando…' : 'Sin artículos en almacén.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-mutedForeground">Mostrando: {filtered.length}</div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={editOpen}
        title={editItem ? `Editar: ${editItem.numero_inventario}` : 'Editar'}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
        className="max-w-3xl"
      >
        {editItem ? (
          <InventoryForm
            mode="edit"
            allowSecretaria
            initial={editItem}
            submitLabel="Guardar cambios"
            busy={editBusy}
            onSubmit={onEditSubmit}
          />
        ) : null}
      </Modal>

      <Modal
        open={moveOpen}
        title={moveItem ? `Asignar a secretaría: ${moveItem.numero_inventario}` : 'Asignar'}
        onClose={() => {
          setMoveOpen(false);
          setMoveItem(null);
          setMoveSecretaria('');
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="text-sm text-mutedForeground">
            El artículo saldrá del almacén y quedará <span className="font-semibold">En uso</span>.
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-mutedForeground">Secretaría destino</label>
            <Select value={moveSecretaria} onChange={(e) => setMoveSecretaria(e.target.value)}>
              <option value="">Seleccione…</option>
              {SECRETARIAS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={onMove} disabled={moveBusy}>
              {moveBusy ? 'Moviendo…' : 'Confirmar'}
            </Button>
            <Button variant="secondary" onClick={() => setMoveOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={qrOpen}
        title={qrItem ? `QR: ${qrItem.numero_inventario}` : 'QR'}
        onClose={() => {
          setQrOpen(false);
          setQrItem(null);
          setQrImage(null);
        }}
        className="max-w-md"
      >
        <div className="flex flex-col items-center gap-3">
          {qrImage ? (
            <img src={qrImage} alt="QR" className="w-full max-w-[320px] rounded-lg border bg-white p-2" />
          ) : (
            <div className="text-sm text-mutedForeground">Generando…</div>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              if (!qrImage) return;
              const a = document.createElement('a');
              a.href = qrImage;
              a.download = `${qrItem?.numero_inventario || 'qr'}.png`;
              a.click();
            }}
            disabled={!qrImage}
          >
            Descargar PNG
          </Button>
        </div>
      </Modal>
    </div>
  );
}
