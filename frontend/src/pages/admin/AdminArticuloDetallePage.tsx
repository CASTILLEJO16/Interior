import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

function money(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
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
    async function load() {
      setLoading(true);
      const res = await api.inventarioById(token as string, id);
      setLoading(false);
      if (!res.success || !res.data) {
        toast.push({ type: 'error', title: 'No se pudo cargar el artículo', detail: res.message });
        return;
      }
      setItem(res.data);
    }
    load();
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
      <div className="flex items-center justify-between print:hidden">
        <div>
          <div className="text-lg font-semibold">Detalle del Artículo</div>
          <div className="text-xs text-mutedForeground">{item.numero_inventario}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => nav(-1)}>
            Volver
          </Button>
          <Button variant="secondary" onClick={openQr}>
            Ver QR
          </Button>
          <Button onClick={handlePrint}>Imprimir</Button>
        </div>
      </div>

      {/* Documento imprimible */}
      <div ref={printRef} className="print-container">
        <Card className="print:shadow-none print:border-none">
          {/* Header del documento */}
          <div className="border-b p-6 text-center">
            <h1 className="text-xl font-bold text-foreground">SISTEMA DE INVENTARIO</h1>
            <p className="text-sm text-mutedForeground">Control de Bienes y Activos</p>
            <p className="mt-1 text-xs text-mutedForeground">Fecha: {new Date().toLocaleDateString('es-MX')}</p>
          </div>

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
                    <p>{formatDate(item.fecha_alta)}</p>
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

                <div>
                  <label className="text-xs font-medium text-mutedForeground">Descripción</label>
                  <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{item.descripcion}</p>
                </div>

                {/* Información de registro */}
                <div className="grid grid-cols-2 gap-4 border-t pt-4 text-xs text-mutedForeground">
                  <div>
                    <label>Fecha de Registro</label>
                    <p>{formatDate(item.fecha_registro)}</p>
                  </div>
                  <div>
                    <label>Última Actualización</label>
                    <p>{item.ultima_actualizacion ? formatDate(item.ultima_actualizacion) : '—'}</p>
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
                  <Button size="sm" variant="secondary" onClick={openQr} className="print:hidden">
                    Generar QR
                  </Button>
                  <p className="mt-2 text-xs text-mutedForeground print:block hidden">Escanea para ver detalles</p>
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
          </CardContent>
        </Card>
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
