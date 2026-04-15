import { useState } from 'react';
import { api } from '../lib/api';
import InventoryForm, { type InventoryFormValues } from '../components/inventory/InventoryForm';
import { useAuth } from '../state/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useToast } from '../state/toast';

export default function RegistroPage() {
  const { token, user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

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
    if (values.imagen) form.set('imagen', values.imagen);

    const res = await api.crearInventario(token, form);
    setBusy(false);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo registrar', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: 'Artículo registrado', detail: user?.secretaria ? `Secretaría: ${user.secretaria}` : undefined });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Registrar nuevo artículo</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryForm mode="create" onSubmit={submit} submitLabel="Guardar artículo" busy={busy} />
        </CardContent>
      </Card>
      <div className="text-xs text-mutedForeground">
        Nota: si eres usuario normal, la secretaría se asigna automáticamente (según tu perfil en el sistema).
      </div>
    </div>
  );
}

