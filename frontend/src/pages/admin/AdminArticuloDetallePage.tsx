import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatDateOnlyTijuana } from '../../lib/date';

function money(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
}

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
      {estatus === 'activo' ? 'Activo' : estatus === 'en_mantenimiento' ? 'En Mantenimiento' : 'Dado de Baja'}
    </span>
  );
}

export default function AdminArticuloDetallePage() {
  const { token } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const params = useParams();
  const printRef = useRef<HTMLDivElement>(null);

  const id = Number(params.id);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;

    async function load(itemId: number, validToken: string) {
      setLoading(true);
      const res = await api.inventarioById(validToken, itemId);
      setLoading(false);
      if (!res.success) {
        toast.push({ type: 'error', title: 'No se pudo cargar', detail: res.message });
        return;
      }
      setItem(res.data || null);

      // Generar QR automáticamente para impresión
      const qrRes = await api.qrInventario(validToken, itemId);
      if (qrRes.success && qrRes.data?.qr_image) {
        setQrImage(qrRes.data.qr_image);
      }
    }

    const numericId = Number(id);
    if (!isNaN(numericId)) load(numericId, token);
  }, [token, id, toast]);

  async function openQr() {
    if (!token || !item) return;
    setQrOpen(true);
    setQrImage(null);
    const res = await api.qrInventario(token, item.id);
    if (!res.success || !res.data?.qr_image) {
      toast.push({ type: 'error', title: 'No se pudo generar QR', detail: res.message });
      return;
    }
    setQrImage(res.data.qr_image);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="py-12 text-center text-mutedForeground">Cargando artículo…</CardContent>
        </Card>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="py-12 text-center text-mutedForeground">No se encontró el artículo.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controles (ocultos en impresión) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="text-lg font-semibold">Detalle del Artículo</div>
          <div className="text-xs text-mutedForeground">{item.numero_inventario}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => nav(-1)} className="flex-1 sm:flex-none">
            Volver
          </Button>
          <Button variant="secondary" onClick={openQr} className="flex-1 sm:flex-none">
            Ver QR
          </Button>
          <Button onClick={handlePrint} className="flex-1 sm:flex-none">Imprimir</Button>
        </div>
      </div>

      {/* Vista en pantalla (visible normalmente) */}
      <Card className="print:hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Información principal */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Número de Inventario</label>
                  <p className="text-lg font-semibold">{item.numero_inventario}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Fecha de Alta</label>
                  <p>{formatDateOnlyTijuana(item.fecha_alta)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-mutedForeground">Nombre del Artículo</label>
                <p className="text-base font-medium">{item.nombre_articulo}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Categoría</label>
                  <p>{item.categoria || '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Subcategoría</label>
                  <p>{item.subcategoria || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Estado de Uso</label>
                  <p className="mt-1">{estadoUsoBadge(item.estado_uso)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Estatus</label>
                  <p className="mt-1">{estatusBadge(item.estatus)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Secretaría</label>
                  <p>{item.secretaria}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Costo</label>
                  <p className="font-semibold">{money(item.costo)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-mutedForeground">Resguardante</label>
                <p>{item.resguardante}</p>
              </div>

              {item.descripcion && (
                <div>
                  <label className="text-xs font-medium text-mutedForeground">Descripción</label>
                  <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{item.descripcion}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-xs text-mutedForeground">
                <div>
                  <label>Fecha de Registro</label>
                  <p>{formatDateOnlyTijuana(item.fecha_registro)}</p>
                </div>
                <div>
                  <label>Última Actualización</label>
                  <p>{item.ultima_actualizacion ? formatDateOnlyTijuana(item.ultima_actualizacion) : '—'}</p>
                </div>
              </div>
            </div>

            {/* Imagen y QR */}
            <div className="space-y-4">
              {item.imagen ? (
                <div className="rounded-lg border p-2">
                  <label className="mb-2 block text-xs font-medium text-mutedForeground">Imagen del Artículo</label>
                  <img
                    src={item.imagen}
                    alt={item.nombre_articulo}
                    className="h-48 w-full rounded-md object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-mutedForeground">
                  Sin imagen registrada
                </div>
              )}

              <div className="rounded-lg border p-2 text-center">
                <label className="mb-2 block text-xs font-medium text-mutedForeground">Código QR</label>
                {qrImage ? (
                  <img src={qrImage} alt="QR" className="mx-auto h-32 w-32 rounded-lg border bg-white p-2" />
                ) : (
                  <Button size="sm" variant="secondary" onClick={openQr}>
                    Ver QR
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documento imprimible */}
      <div ref={printRef} className="hidden print:block print:bg-white print:text-black">
        <div className="print-container rounded-none border-0 bg-white p-0 text-black shadow-none">
          {/* Header del documento - diseño profesional */}
          <div className="border-b-2 border-black p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-black bg-white">
                  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4a2 2 0 001-1.73z" />
                    <path d="M3.3 7L12 12l8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-black">SISTEMA DE INVENTARIO</h1>
                  <p className="text-sm font-medium text-black">Control de Bienes y Activos</p>
                  <p className="text-xs text-gray-600">BDInterior - Gobierno Municipal</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Fecha de emisión:</p>
                <p className="text-sm font-semibold text-black">{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white text-black">
            {/* Título del documento */}
            <div className="mb-6 text-center">
              <h2 className="text-lg font-bold text-black">HOJA DE RESGUARDO DE BIENES MUEBLES</h2>
              <p className="text-sm text-gray-600">Documento oficial de control patrimonial</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 print:grid-cols-3">
              {/* Información principal - 2/3 del ancho */}
              <div className="md:col-span-2 print:col-span-2 space-y-4">
                {/* Sección: Identificación */}
                <div className="rounded-lg border border-gray-300 p-4 print:border-black print:bg-white">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-600 print:text-black">Identificación del Bien</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 print:text-black">Número de Inventario</label>
                      <p className="text-lg font-bold text-black">{item.numero_inventario}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 print:text-black">Fecha de Alta</label>
                      <p className="text-sm font-semibold text-black">{formatDateOnlyTijuana(item.fecha_alta)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-600 print:text-black">Nombre del Artículo</label>
                    <p className="text-base font-bold text-black">{item.nombre_articulo}</p>
                  </div>
                </div>

                {/* Sección: Clasificación */}
                <div className="rounded-lg border border-gray-300 p-4 print:border-black print:bg-white">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-600 print:text-black">Clasificación</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 print:text-black">Categoría</label>
                      <p className="text-sm font-semibold text-black">{item.categoria || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 print:text-black">Subcategoría</label>
                      <p className="text-sm font-semibold text-black">{item.subcategoria || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 print:text-black">Estado de Uso</label>
                      <p className="mt-1 text-sm font-semibold text-black">
                        {item.estado_uso === 'en_uso' ? 'EN USO' : 'EN ALMACÉN'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 print:text-black">Estatus</label>
                      <p className="mt-1 text-sm font-semibold text-black uppercase">{item.estatus}</p>
                    </div>
                  </div>
                </div>

                {/* Sección: Ubicación y Valor */}
                <div className="rounded-lg border border-gray-300 p-4 print:border-black print:bg-white">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-600 print:text-black">Ubicación y Valor</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 print:text-black">Secretaría / Área</label>
                      <p className="text-sm font-semibold text-black">{item.secretaria}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 print:text-black">Valor de Adquisición</label>
                      <p className="text-lg font-bold text-black">{money(item.costo)}</p>
                    </div>
                  </div>
                </div>

                {/* Sección: Responsable */}
                <div className="rounded-lg border border-gray-300 p-4 print:border-black print:bg-white">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-600 print:text-black">Responsable del Resguardo</h3>
                  <div>
                    <label className="text-xs font-medium text-gray-600 print:text-black">Nombre del Resguardante</label>
                    <p className="text-base font-bold text-black">{item.resguardante}</p>
                  </div>
                </div>

                {/* Sección: Descripción */}
                {item.descripcion && (
                  <div className="rounded-lg border border-gray-300 p-4 print:border-black print:bg-white">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-600 print:text-black">Descripción del Bien</h3>
                    <p className="whitespace-pre-wrap text-sm text-black">{item.descripcion}</p>
                  </div>
                )}

                {/* Información de registro */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-300 pt-4 text-xs print:border-black print:bg-white">
                  <div>
                    <label className="text-gray-600 print:text-black">Fecha de Registro en Sistema</label>
                    <p className="font-semibold text-black">{formatDateOnlyTijuana(item.fecha_registro)}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 print:text-black">Última Actualización</label>
                    <p className="font-semibold text-black">{item.ultima_actualizacion ? formatDateOnlyTijuana(item.ultima_actualizacion) : 'Sin cambios'}</p>
                  </div>
                </div>
              </div>

              {/* Imagen y QR */}
              <div className="space-y-4">
                {item.imagen ? (
                  <div className="rounded-lg border p-2 print:border-black print:bg-white">
                    <label className="mb-2 block text-xs font-medium text-mutedForeground print:text-black">Imagen del Artículo</label>
                    <img
                      src={item.imagen}
                      alt={item.nombre_articulo}
                      className="h-48 w-full rounded-md object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-mutedForeground print:border-black print:text-black print:bg-white">
                    Sin imagen registrada
                  </div>
                )}

                <div className="rounded-lg border p-2 text-center print:border-black print:bg-white">
                  <label className="mb-2 block text-xs font-medium text-mutedForeground print:text-black">Código QR</label>
                  <Button size="sm" variant="secondary" onClick={openQr} className="print:hidden">
                    Generar QR
                  </Button>
                  {qrImage ? (
                    <img src={qrImage} alt="QR" className="mx-auto h-32 w-32 rounded-lg border border-black bg-white p-2" />
                  ) : (
                    <p className="mt-2 text-xs text-mutedForeground print:text-black">Escanea para ver detalles</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección de firmas (solo impresión) */}
            <div className="mt-8 hidden border-t pt-8 print:block">
              <h3 className="mb-6 text-center text-sm font-semibold">CONSTANCIA DE RESGUARDO</h3>
              <div className="grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="mb-2 h-px bg-black"></div>
                  <p className="text-xs">Resguardante</p>
                  <p className="mt-1 text-sm font-medium">{item.resguardante}</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-px bg-black"></div>
                  <p className="text-xs">Autoriza</p>
                  <p className="mt-1 text-sm font-medium">Administración</p>
                </div>
              </div>
            </div>

            {/* Footer del documento */}
            <div className="mt-6 border-t pt-4 text-center text-xs text-mutedForeground print:block hidden">
              <p>Documento generado por el Sistema de Inventario BDInterior</p>
              <p className="mt-1">Este documento es un comprobante oficial de resguardo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal QR */}
      <Modal
        open={qrOpen}
        title={`QR: ${item.numero_inventario}`}
        onClose={() => {
          setQrOpen(false);
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
          <div className="text-center">
            <p className="font-medium">{item.nombre_articulo}</p>
            <p className="text-sm text-mutedForeground">{item.numero_inventario}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              if (!qrImage) return;
              const a = document.createElement('a');
              a.href = qrImage;
              a.download = `${item.numero_inventario}_qr.png`;
              a.click();
            }}
            disabled={!qrImage}
          >
            Descargar PNG
          </Button>
        </div>
      </Modal>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body * {
            visibility: hidden;
          }
          .print-container,
          .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
