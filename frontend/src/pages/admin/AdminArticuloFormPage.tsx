import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import InventoryForm, { type InventoryFormValues } from '../../components/inventory/InventoryForm';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';

export default function AdminArticuloFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { token } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const params = useParams();

  const id = useMemo(() => (params.id ? Number(params.id) : null), [params.id]);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (mode !== 'edit' || !token || !id) return;
      setLoading(true);
      const res = await api.inventarioById(token, id);
      setLoading(false);
      if (!active) return;
      if (!res.success || !res.data) {
        toast.push({ type: 'error', title: 'No se pudo cargar el artículo', detail: res.message });
        return;
      }
      setItem(res.data);
    }
    load();
    return () => {
      active = false;
    };
  }, [mode, token, id, toast]);

  async function submit(values: InventoryFormValues) {
    if (!token) return;
    setBusy(true);
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

    const res =
      mode === 'create'
        ? await api.crearInventario(token, form)
        : await api.actualizarInventario(token, id!, form);
    setBusy(false);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo guardar', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: mode === 'create' ? 'Artículo creado' : 'Artículo actualizado' });
    nav('/admin/almacen', { replace: true });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">{mode === 'create' ? 'Agregar artículo' : 'Editar artículo'}</div>
          <div className="text-xs text-mutedForeground">Formulario admin (alta y edición).</div>
        </div>
        <Button variant="secondary" onClick={() => nav(-1)}>
          Volver
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Nuevo' : loading ? 'Cargando…' : item?.numero_inventario || 'Editar'}</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryForm
            mode={mode}
            allowSecretaria
            initial={item || undefined}
            onSubmit={submit}
            submitLabel={mode === 'create' ? 'Crear' : 'Guardar'}
            busy={busy}
          />
        </CardContent>
      </Card>
    </div>
  );
}

