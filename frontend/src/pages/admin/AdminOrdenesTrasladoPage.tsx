import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { TransferOrder } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function AdminOrdenesTrasladoPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [ordenes, setOrdenes] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    const res = await api.getOrdenesTraslado(token);
    setLoading(false);
    if (res.success && res.data) {
      setOrdenes(res.data);
    } else {
      toast.push({ type: 'error', title: 'Error', detail: res.message || 'No se pudieron cargar las órdenes' });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = ordenes.filter(o => 
    [o.folio, o.nombre_articulo, o.numero_inventario, o.secretaria_destino].some(s => 
      s.toLowerCase().includes(search.toLowerCase())
    )
  );

  function handlePrint(data: TransferOrder) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.push({ type: 'error', title: 'Error', detail: 'No se pudo abrir la ventana de impresión.' });
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
              <span class="value">${data.usuario_nombre}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datos del Artículo</div>
          <div class="grid">
            <div class="field">
              <span class="label">Número de Inventario</span>
              <span class="value">${data.numero_inventario}</span>
            </div>
            <div class="field">
              <span class="label">Nombre del Artículo</span>
              <span class="value">${data.nombre_articulo}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Ruta de Traslado</div>
          <div class="grid">
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <span class="label">ORIGEN</span>
              <span class="value" style="font-size: 16px;">${data.secretaria_origen}</span>
            </div>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
              <span class="label">DESTINO</span>
              <span class="value" style="font-size: 16px; color: #166534;">${data.secretaria_destino}</span>
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
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Órdenes de Traslado</h1>
          <p className="text-sm text-mutedForeground">Repositorio histórico de folios generados.</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input 
                placeholder="Buscar por folio, artículo o secretaría..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-mutedForeground uppercase">
                <tr className="border-b">
                  <th className="py-2 pr-3">Folio</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Artículo</th>
                  <th className="py-2 pr-3 uppercase">Origen / Destino</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 pr-3 font-mono font-bold text-red-500">{o.folio}</td>
                    <td className="py-3 pr-3 text-mutedForeground">
                      {new Date(o.fecha).toLocaleDateString()}<br/>
                      <span className="text-[10px]">{new Date(o.fecha).toLocaleTimeString()}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{o.nombre_articulo}</div>
                      <div className="text-xs text-mutedForeground">{o.numero_inventario}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted border font-medium">{o.secretaria_origen}</span>
                        <svg viewBox="0 0 24 24" className="h-3 w-3 text-mutedForeground" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 border-green-200 text-green-700 font-medium dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">{o.secretaria_destino}</span>
                      </div>
                      <div className="text-[10px] text-mutedForeground mt-1 italic">Autorizó: {o.usuario_nombre}</div>
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => handlePrint(o)} className="h-8 text-xs">
                        Reimprimir
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && !loading && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-mutedForeground">
                      No se encontraron órdenes de traslado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
