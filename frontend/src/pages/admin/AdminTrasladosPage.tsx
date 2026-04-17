import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { useSecretarias } from '../../lib/secretarias';

type LastTransfer = {
  folio: string;
  item: InventoryItem;
  origen: string;
  destino: string;
  motivo: string;
  fecha: string;
  usuario: string;
};

export default function AdminTrasladosPage() {
  const { token, user } = useAuth();
  const toast = useToast();
  const secretarias = useSecretarias();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  // Estado para el modal de éxito y datos de impresión
  const [lastTransfer, setLastTransfer] = useState<LastTransfer | null>(null);

  async function reload() {
    if (!token) return;
    setLoading(true);
    const inv = await api.inventario(token);
    setLoading(false);
    if (inv.success && inv.data) setItems(inv.data);
    if (!inv.success) toast.push({ type: 'error', title: 'No se pudo cargar inventario', detail: inv.message });
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

  function handlePrint(data: LastTransfer) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.push({ type: 'error', title: 'Error', detail: 'No se pudo abrir la ventana de impresión. Verifique el bloqueador de ventanas emergentes.' });
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Traslado - ${data.folio}</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #000; }
          .folio { font-size: 18px; color: #444; font-weight: 500; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .field { margin-bottom: 10px; }
          .label { font-size: 11px; color: #888; display: block; }
          .value { font-size: 14px; font-weight: 500; }
          .signatures { margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; text-align: center; }
          .signature-box { border-top: 1px solid #000; padding-top: 10px; font-size: 11px; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Inventario BDInterior</div>
            <div style="font-size: 12px; color: #666;">Sistema de Control de Activos Fijos</div>
          </div>
          <div style="text-align: right;">
            <div class="folio">ORDEN DE TRASLADO</div>
            <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${data.folio}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Información del Movimiento</div>
          <div class="grid">
            <div class="field">
              <span class="label">Fecha y Hora</span>
              <span class="value">${new Date(data.fecha).toLocaleString()}</span>
            </div>
            <div class="field">
              <span class="label">Autorizado por</span>
              <span class="value">${data.usuario}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datos del Artículo</div>
          <div class="grid">
            <div class="field">
              <span class="label">Número de Inventario</span>
              <span class="value">${data.item.numero_inventario}</span>
            </div>
            <div class="field">
              <span class="label">Nombre del Artículo</span>
              <span class="value">${data.item.nombre_articulo}</span>
            </div>
          </div>
          <div class="field">
            <span class="label">Descripción</span>
            <span class="value">${data.item.descripcion || 'Sin descripción'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Ruta de Traslado</div>
          <div class="grid">
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <span class="label">ORIGEN</span>
              <span class="value" style="font-size: 16px;">${data.origen}</span>
            </div>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
              <span class="label">DESTINO</span>
              <span class="value" style="font-size: 16px; color: #166534;">${data.destino}</span>
            </div>
          </div>
          <div class="field" style="margin-top: 15px;">
            <span class="label">Motivo del Traslado</span>
            <span class="value">${data.motivo || 'No especificado'}</span>
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            ENTREGADO POR<br>(Nombre y Firma)
          </div>
          <div class="signature-box">
            RECIBIDO POR<br>(Nombre y Firma)
          </div>
          <div class="signature-box">
            AUTORIZADO POR<br>Sello y Firma
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            // window.close(); // Opcional: cerrar tras imprimir
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  async function submit() {
    if (!token || !selected) return;
    if (!destino.trim()) {
      toast.push({ type: 'error', title: 'Secretaría destino requerida' });
      return;
    }
    setBusy(true);

    // Determinar el tipo de traslado
    const isOrigenAlmacen = selected.estado_uso === 'en_almacen' || selected.secretaria === 'Almacén';
    const isDestinoAlmacen = destino === 'Almacén';

    let res;
    if (isOrigenAlmacen || isDestinoAlmacen) {
      res = await api.moverInventario(token, selected.id, {
        estado_uso: isDestinoAlmacen ? 'en_almacen' : 'en_uso',
        secretaria: isDestinoAlmacen ? undefined : destino.trim()
      });
    } else {
      res = await api.trasladarInventario(token, selected.id, {
        secretaria_destino: destino.trim(),
        motivo_traslado: motivo.trim() || undefined
      });
    }

    setBusy(false);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo trasladar', detail: res.message });
      return;
    }

    toast.push({ type: 'success', title: 'Traslado realizado', detail: `${selected.secretaria} → ${destino}` });
    
    // Guardar datos para el modal de éxito e impresión
    setLastTransfer({
      folio: res.folio,
      item: { ...selected },
      origen: selected.secretaria,
      destino: destino.trim(),
      motivo: motivo.trim(),
      fecha: new Date().toISOString(),
      usuario: user?.nombre_completo || user?.usuario || 'Admin'
    });

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
                <option value="Almacén">📦 Almacén</option>
                <option disabled>──────────────</option>
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

      {/* Modal de Éxito con Folio e Impresión */}
      <Modal 
        open={!!lastTransfer} 
        onClose={() => setLastTransfer(null)}
        title="Traslado Exitoso"
      >
        <div className="flex flex-col items-center gap-6 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          
          <div>
            <p className="text-sm text-mutedForeground">Se ha generado el folio de traslado:</p>
            <h2 className="text-3xl font-bold text-foreground mt-1">{lastTransfer?.folio}</h2>
          </div>

          <div className="w-full rounded-xl border bg-muted/30 p-4 text-left text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-mutedForeground">Artículo:</span>
              <span className="font-medium text-right">{lastTransfer?.item.numero_inventario}</span>
              <span className="text-mutedForeground">Destino:</span>
              <span className="font-medium text-right">{lastTransfer?.destino}</span>
            </div>
          </div>

          <div className="flex w-full gap-3">
            <Button 
              className="flex-1 gap-2" 
              onClick={() => lastTransfer && handlePrint(lastTransfer)}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-2 4H8v-6h8v6z" />
              </svg>
              Imprimir Orden
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1" 
              onClick={() => setLastTransfer(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
