import { useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import type { InventoryItem } from '../../lib/types';
import { cn } from '../../lib/cn';
import { SECRETARIAS } from '../../lib/secretarias';

const subcategoriasPorCategoria: Record<string, string[]> = {
  Mobiliario: ['Silla', 'Escritorio', 'Archivero', 'Librero', 'Mesa', 'Sofá', 'Mueble de almacenamiento'],
  'Equipos Electrónicos': ['Computadora', 'Monitor', 'Impresora', 'Scanner', 'Proyector', 'Teléfono', 'Tablet', 'Laptop'],
  Vehículos: ['Camioneta', 'Automóvil', 'Motocicleta'],
  'Equipos de Oficina': ['Calculadora', 'Engrapadora', 'Guillotina', 'Laminadora', 'Perforadora', 'Rotuladora']
};

export type InventoryFormValues = {
  numero_inventario: string;
  nombre_articulo: string;
  categoria: string;
  subcategoria: string;
  estado_uso: 'en_uso' | 'en_almacen';
  fecha_alta: string;
  costo: string;
  resguardante: string;
  descripcion: string;
  secretaria?: string;
  estatus?: 'activo' | 'dado_de_baja' | 'en_mantenimiento';
  imagen?: File | null;
};

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export default function InventoryForm({
  initial,
  mode,
  allowSecretaria,
  onSubmit,
  submitLabel,
  busy
}: {
  initial?: Partial<InventoryItem>;
  mode: 'create' | 'edit';
  allowSecretaria?: boolean;
  onSubmit: (values: InventoryFormValues) => void;
  submitLabel: string;
  busy?: boolean;
}) {
  const [values, setValues] = useState<InventoryFormValues>(() => ({
    numero_inventario: initial?.numero_inventario || '',
    nombre_articulo: initial?.nombre_articulo || '',
    categoria: initial?.categoria || '',
    subcategoria: initial?.subcategoria || '',
    estado_uso: initial?.estado_uso || 'en_uso',
    fecha_alta: initial?.fecha_alta || todayIso(),
    costo: initial?.costo != null ? String(initial.costo) : '',
    resguardante: initial?.resguardante || '',
    descripcion: initial?.descripcion || '',
    secretaria: initial?.secretaria || '',
    estatus: initial?.estatus || 'activo',
    imagen: null
  }));

  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.imagen || null);
  const initialSecretaria = (initial?.secretaria || '').trim();
  const initialInList = !!initialSecretaria && SECRETARIAS.includes(initialSecretaria as any);
  const [secretariaMode, setSecretariaMode] = useState<'select' | 'custom'>(() =>
    allowSecretaria ? (initialInList || !initialSecretaria ? 'select' : 'custom') : 'select'
  );
  const [customSecretaria, setCustomSecretaria] = useState<string>(() => (allowSecretaria && !initialInList ? initialSecretaria : ''));

  useEffect(() => {
    if (!values.categoria) {
      setValues((v) => ({ ...v, subcategoria: '' }));
    } else if (values.subcategoria && !subcategoriasPorCategoria[values.categoria]?.includes(values.subcategoria)) {
      setValues((v) => ({ ...v, subcategoria: '' }));
    }
  }, [values.categoria]);

  useEffect(() => {
    if (!allowSecretaria) return;
    if (secretariaMode !== 'select') return;
    if (values.secretaria && SECRETARIAS.includes(values.secretaria as any)) return;
    setValues((v) => ({ ...v, secretaria: SECRETARIAS[0] }));
  }, [allowSecretaria, secretariaMode, values.secretaria]);

  const subcats = useMemo(() => subcategoriasPorCategoria[values.categoria] || [], [values.categoria]);

  function update<K extends keyof InventoryFormValues>(key: K, value: InventoryFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const canSubmit = useMemo(() => {
    return (
      values.numero_inventario.trim() &&
      values.nombre_articulo.trim() &&
      values.fecha_alta &&
      values.descripcion.trim() &&
      values.resguardante.trim() &&
      values.costo.trim() &&
      !Number.isNaN(Number(values.costo))
    );
  }, [values]);

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit(values);
      }}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-mutedForeground">Número de inventario *</label>
        <Input value={values.numero_inventario} onChange={(e) => update('numero_inventario', e.target.value)} placeholder="Ej: INV-001" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-mutedForeground">Nombre del artículo *</label>
        <Input value={values.nombre_articulo} onChange={(e) => update('nombre_articulo', e.target.value)} placeholder="Ej: Silla ergonómica" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-mutedForeground">Categoría</label>
        <Select value={values.categoria} onChange={(e) => update('categoria', e.target.value)}>
          <option value="">Seleccione…</option>
          <option value="Mobiliario">Mobiliario</option>
          <option value="Equipos Electrónicos">Equipos Electrónicos</option>
          <option value="Vehículos">Vehículos</option>
          <option value="Equipos de Oficina">Equipos de Oficina</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-mutedForeground">Subcategoría</label>
        <Select value={values.subcategoria} onChange={(e) => update('subcategoria', e.target.value)} disabled={!values.categoria}>
          <option value="">{values.categoria ? 'Seleccione…' : 'Primero seleccione una categoría'}</option>
          {subcats.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-mutedForeground">Estado de uso *</label>
        <Select value={values.estado_uso} onChange={(e) => update('estado_uso', e.target.value as 'en_uso' | 'en_almacen')}>
          <option value="en_uso">En uso</option>
          <option value="en_almacen">En almacén</option>
        </Select>
      </div>

      {allowSecretaria ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-mutedForeground">Secretaría</label>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <Select
              className="md:col-span-2"
              value={secretariaMode}
              onChange={(e) => {
                const mode = e.target.value as 'select' | 'custom';
                setSecretariaMode(mode);
                if (mode === 'select') {
                  const next = values.secretaria && SECRETARIAS.includes(values.secretaria as any) ? values.secretaria : SECRETARIAS[0];
                  update('secretaria', next);
                  setCustomSecretaria('');
                } else {
                  update('secretaria', customSecretaria || values.secretaria || '');
                }
              }}
            >
              <option value="select">Lista</option>
              <option value="custom">Otra</option>
            </Select>
            {secretariaMode === 'select' ? (
              <Select
                className="md:col-span-3"
                value={SECRETARIAS.includes((values.secretaria || '') as any) ? (values.secretaria as any) : SECRETARIAS[0]}
                onChange={(e) => update('secretaria', e.target.value)}
              >
                {SECRETARIAS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                className="md:col-span-3"
                value={customSecretaria}
                onChange={(e) => {
                  setCustomSecretaria(e.target.value);
                  update('secretaria', e.target.value);
                }}
                placeholder="Escriba la secretaría…"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-mutedForeground">Fecha de alta *</label>
          <Input type="date" value={values.fecha_alta} onChange={(e) => update('fecha_alta', e.target.value)} />
        </div>
      )}

      {allowSecretaria ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-mutedForeground">Fecha de alta *</label>
          <Input type="date" value={values.fecha_alta} onChange={(e) => update('fecha_alta', e.target.value)} />
        </div>
      ) : null}

      {allowSecretaria ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-mutedForeground">Estatus</label>
          <Select value={values.estatus || 'activo'} onChange={(e) => update('estatus', e.target.value as any)}>
            <option value="activo">Activo</option>
            <option value="dado_de_baja">Dado de baja</option>
            <option value="en_mantenimiento">En mantenimiento</option>
          </Select>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-mutedForeground">Costo *</label>
          <Input value={values.costo} onChange={(e) => update('costo', e.target.value)} inputMode="decimal" placeholder="0.00" />
        </div>
      )}

      {allowSecretaria ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-mutedForeground">Costo *</label>
          <Input value={values.costo} onChange={(e) => update('costo', e.target.value)} inputMode="decimal" placeholder="0.00" />
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-mutedForeground">Resguardante *</label>
        <Input value={values.resguardante} onChange={(e) => update('resguardante', e.target.value)} placeholder="Nombre completo" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-mutedForeground">Imagen</label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            update('imagen', f);
            if (f) {
              const url = URL.createObjectURL(f);
              setPreviewUrl(url);
            } else {
              setPreviewUrl(initial?.imagen || null);
            }
          }}
        />
        {previewUrl ? (
          <div className="mt-2 overflow-hidden rounded-md border bg-background">
            <img src={previewUrl} alt="Vista previa" className="h-40 w-full object-cover" />
          </div>
        ) : null}
      </div>

      <div className={cn('flex flex-col gap-1', 'md:col-span-2')}>
        <label className="text-xs font-medium text-mutedForeground">Descripción *</label>
        <Textarea value={values.descripcion} onChange={(e) => update('descripcion', e.target.value)} rows={4} placeholder="Marca, modelo, características…" />
      </div>

      <div className="mt-2 flex gap-2 md:col-span-2">
        <Button type="submit" disabled={!canSubmit || !!busy}>
          {busy ? 'Guardando…' : submitLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setValues({
              numero_inventario: '',
              nombre_articulo: '',
              categoria: '',
              subcategoria: '',
              estado_uso: 'en_uso',
              fecha_alta: todayIso(),
              costo: '',
              resguardante: '',
              descripcion: '',
              secretaria: '',
              estatus: 'activo',
              imagen: null
            })
          }
        >
          Limpiar
        </Button>
      </div>

      <div className="text-xs text-mutedForeground md:col-span-2">
        {mode === 'create' ? 'Los campos con * son obligatorios.' : 'Si no seleccionas imagen, se conserva la actual (si existe).'}
      </div>
    </form>
  );
}
