import { useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import type { InventoryItem } from '../../lib/types';
import { cn } from '../../lib/cn';
import { useSecretarias } from '../../lib/secretarias';

const subcategoriasPorCategoria: Record<string, string[]> = {
  Mobiliario: [
    'Silla ejecutiva', 'Silla secretarial', 'Silla de visita', 'Silla apilable', 'Silla ergonómica',
    'Escritorio ejecutivo', 'Escritorio secretarial', 'Escritorio en L', 'Escritorio de cómputo',
    'Archivero de 2 gavetas', 'Archivero de 3 gavetas', 'Archivero de 4 gavetas', 'Archivero metálico',
    'Librero', 'Estante metálico', 'Estante de madera', 'Locker', 'Credenza',
    'Mesa de juntas', 'Mesa de trabajo', 'Mesa auxiliar', 'Mesa de centro', 'Mesa plegable',
    'Sofá', 'Sillón', 'Silla de espera', 'Sala de espera (juego)', 'Banca',
    'Mueble de almacenamiento', 'Vitrina', 'Aparador', 'Counter de atención', 'Mostrador',
    'Perchero', 'Porta paraguas', 'Basurero de oficina', 'Carro de transporte'
  ],
  'Equipos de Cómputo': [
    'Computadora de escritorio (CPU)', 'Laptop', 'Tablet', 'Monitor', 'Monitor curvo',
    'Teclado', 'Mouse', 'Docking station', 'Hub USB', 'UPS / No break',
    'Disco duro externo', 'Memoria USB', 'Lector de tarjetas', 'Webcam', 'Micrófono USB',
    'Audífonos con micrófono', 'Tarjeta gráfica', 'Servidor', 'NAS / Almacenamiento en red',
    'Switch de red', 'Router', 'Access point', 'Patch panel'
  ],
  'Equipos de Impresión y Digitalización': [
    'Impresora de escritorio', 'Impresora láser', 'Impresora inyección de tinta',
    'Impresora multifuncional', 'Impresora de gran formato', 'Impresora de etiquetas',
    'Impresora de credenciales', 'Scáner de documentos', 'Scáner de cama plana',
    'Scáner portátil', 'Copiadora', 'Fotocopiadora industrial', 'Plóter'
  ],
  'Equipos de Comunicación': [
    'Teléfono de escritorio', 'Teléfono inalámbrico', 'Teléfono IP (VoIP)',
    'Central telefónica (PBX)', 'Conmutador', 'Radio de comunicación (walkie-talkie)',
    'Videoteléfono', 'Auricular telefónico', 'Speakerphone / Manos libres conferencia',
    'Fax', 'Interfón', 'Bocina de intercomunicación'
  ],
  'Equipos Audiovisuales': [
    'Proyector', 'Pantalla de proyección', 'Televisor', 'Monitor LED de presentación',
    'Pizarrón interactivo (smart board)', 'Podium', 'Micrófono de solapa',
    'Micrófono de pie', 'Micrófono inalámbrico', 'Amplificador de audio',
    'Bocinas', 'Sistema de videoconferencia', 'Cámara de videoconferencia',
    'Control remoto de presentaciones (clicker)', 'DVD / Blu-ray', 'Pantalla LED exterior'
  ],
  'Equipos de Oficina': [
    'Calculadora', 'Calculadora financiera', 'Engrapadora de escritorio', 'Engrapadora industrial',
    'Guillotina de papel', 'Laminadora', 'Perforadora', 'Encuadernadora',
    'Rotuladora', 'Selladora', 'Máquina de escribir', 'Franqueadora / Máquina de sellos',
    'Triturador de documentos', 'Contador de billetes', 'Detector de billetes falsos',
    'Reloj checador / Control de asistencia', 'Reloj de pared', 'Ventilador de escritorio',
    'Despachador de agua', 'Cafetera', 'Microondas', 'Refrigerador pequeño'
  ],
  Vehículos: [
    'Automóvil sedán', 'Automóvil compacto', 'Camioneta pickup', 'Camioneta SUV',
    'Camioneta de carga', 'Van / Minibus', 'Autobús', 'Motocicleta',
    'Bicicleta', 'Carretilla eléctrica', 'Maquinaria pesada'
  ],
  'Seguridad y Vigilancia': [
    'Cámara CCTV', 'Cámara IP', 'DVR / NVR (grabador)', 'Monitor de vigilancia',
    'Control de acceso biométrico', 'Control de acceso con tarjeta', 'Lector de huella digital',
    'Detector de metales (arco)', 'Detector de metales (manual)',
    'Alarma de incendio', 'Extinguidor', 'Botón de pánico', 'Candado digital',
    'Caja fuerte', 'Casillero con llave', 'Mampara antivandalismo'
  ],
  'Climatización y Electricidad': [
    'Aire acondicionado tipo split', 'Aire acondicionado de ventana', 'Aire acondicionado portátil',
    'Calefactor', 'Ventilador de techo', 'Ventilador de pie', 'Deshumidificador',
    'Purificador de aire', 'Planta de luz / Generador', 'Regulador de voltaje',
    'Extensión eléctrica', 'Multicontacto', 'Lámpara de escritorio', 'Lámpara de pie',
    'Luminaria LED', 'Panel solar'
  ],
  'Herramientas y Equipo de Mantenimiento': [
    'Escalera', 'Taladro', 'Rotomartillo', 'Esmeriladora', 'Sierra',
    'Aspiradora industrial', 'Pulidora', 'Hidrolavadora', 'Carrito de herramientas',
    'Caja de herramientas', 'Voltímetro / Multímetro', 'Kit de herramientas de cómputo'
  ],
  'Mobiliario Especial': [
    'Cubículo modular', 'Mampara divisoria', 'Pared divisoria móvil',
    'Podium / Atril', 'Exhibidor', 'Mueble de archivo muerto', 'Casillero de empleados',
    'Casillero de llaves', 'Mueble para impresora', 'Soporte para monitor',
    'Soporte para TV (pared)', 'Soporte para proyector (techo)', 'Cortinas / Persianas',
    'Tapete / Alfombra de oficina'
  ],
  'Material Bibliográfico y Documental': [
    'Libro técnico', 'Enciclopedia', 'Revista de suscripción', 'Ley / Reglamento impreso',
    'Manual de procedimientos', 'Acervo documental', 'Archivo histórico',
    'Plano técnico', 'Mapa'
  ],
  'Equipo Médico y de Primeros Auxilios': [
    'Botiquín de primeros auxilios', 'Camilla', 'Silla de ruedas',
    'Tensiómetro', 'Termómetro digital', 'Desfibrilador (DEA)',
    'Oxímetro', 'Kit de primeros auxilios'
  ]
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

  const secretarias = useSecretarias();
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.imagen || null);
  const initialSecretaria = (initial?.secretaria || '').trim();
  const initialInList = !!initialSecretaria && secretarias.includes(initialSecretaria as any);
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
    if (values.secretaria && secretarias.includes(values.secretaria as any)) return;
    setValues((v) => ({ ...v, secretaria: secretarias[0] || '' }));
  }, [allowSecretaria, secretariaMode, values.secretaria, secretarias]);

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
                  const next = values.secretaria && secretarias.includes(values.secretaria as any) ? values.secretaria : (secretarias[0] || '');
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
                value={secretarias.includes((values.secretaria || '') as any) ? (values.secretaria as any) : (secretarias[0] || '')}
                onChange={(e) => update('secretaria', e.target.value)}
              >
                {secretarias.map((s) => (
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
