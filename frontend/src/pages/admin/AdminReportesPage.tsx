import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import type { InventoryItem } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useSecretarias } from '../../lib/secretarias';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function toCsv(items: InventoryItem[]) {
  const headers = [
    'id',
    'numero_inventario',
    'nombre_articulo',
    'categoria',
    'subcategoria',
    'secretaria',
    'estado_uso',
    'estatus',
    'fecha_alta',
    'costo',
    'resguardante',
    'descripcion'
  ];
  const lines = [headers.join(',')];
  for (const i of items) {
    const row = [
      i.id,
      i.numero_inventario,
      i.nombre_articulo,
      i.categoria || '',
      i.subcategoria || '',
      i.secretaria,
      i.estado_uso,
      i.estatus,
      i.fecha_alta,
      i.costo,
      i.resguardante,
      i.descripcion.replace(/\s+/g, ' ').trim()
    ].map((v) => `"${String(v).replaceAll('"', '""')}"`);
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export default function AdminReportesPage() {
  const { token } = useAuth();
  const toast = useToast();
  const secretarias = useSecretarias();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

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

  const [searchTerm, setSearchTerm] = useState('');
  const [secretariaFilter, setSecretariaFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch = !searchTerm.trim() || [
        i.numero_inventario,
        i.nombre_articulo,
        i.categoria,
        i.subcategoria,
        i.secretaria,
        i.resguardante
      ].some(f => String(f || '').toLowerCase().includes(searchTerm.trim().toLowerCase()));

      const matchesSecretaria = !secretariaFilter || i.secretaria === secretariaFilter;
      const matchesEstado = !estadoFilter || i.estado_uso === estadoFilter;

      return matchesSearch && matchesSecretaria && matchesEstado;
    });
  }, [items, searchTerm, secretariaFilter, estadoFilter]);

  function download() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    // Encabezado
    doc.setFontSize(18);
    doc.text('Reporte de Inventario', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generado el: ${fecha} | Total de registros: ${filtered.length}`, 14, 28);
    doc.setTextColor(0);

    // Tabla con todas las columnas
    const headers = ['ID', 'N° Inventario', 'Artículo', 'Categoría', 'Subcategoría', 'Secretaría', 'Estado', 'Estatus', 'Resguardante', 'Costo', 'Fecha Registro', 'Descripción'];
    const data = filtered.map((i) => [
      i.id,
      i.numero_inventario,
      i.nombre_articulo.substring(0, 30),
      i.categoria || '-',
      i.subcategoria || '-',
      i.secretaria,
      i.estado_uso === 'en_uso' ? 'En uso' : 'Almacén',
      i.estatus,
      i.resguardante || '-',
      `$${Number(i.costo || 0).toLocaleString('es-MX')}`,
      i.fecha_registro ? new Date(i.fecha_registro).toLocaleDateString('es-MX') : '-',
      (i.descripcion || '-').substring(0, 40)
    ]);

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 5, right: 5 },
      columnStyles: {
        0: { cellWidth: 8 },   // ID
        1: { cellWidth: 22 },  // N° Inventario
        2: { cellWidth: 35 },  // Artículo
        3: { cellWidth: 25 },  // Categoría
        4: { cellWidth: 25 },  // Subcategoría
        5: { cellWidth: 28 },  // Secretaría
        6: { cellWidth: 15 },  // Estado
        7: { cellWidth: 18 },  // Estatus
        8: { cellWidth: 25 },  // Resguardante
        9: { cellWidth: 18 },  // Costo
        10: { cellWidth: 22 }, // Fecha Registro
        11: { cellWidth: 40 }  // Descripción
      }
    });

    // Footer con numeración
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text(`Página ${i} de ${pageCount}`, 280, 200, { align: 'right' });
    }

    doc.save(`inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Reportes</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={reload} disabled={loading}>
                Recargar
              </Button>
              <Button onClick={download} disabled={!filtered.length} variant="secondary">
                Exportar CSV
              </Button>
              <Button onClick={downloadPDF} disabled={!filtered.length} variant="primary">
                Descargar PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número, nombre..."
              />
              <Select value={secretariaFilter} onChange={(e) => setSecretariaFilter(e.target.value)}>
                <option value="">Todas las secretarías</option>
                <option value="Almacén">Almacén</option>
                <option disabled>──────────────</option>
                {secretarias.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="en_uso">En uso</option>
                <option value="en_almacen">En almacén</option>
              </Select>
            </div>
            <div className="text-sm">
              Registros: <span className="font-semibold">{filtered.length}</span>
            </div>
            <div className="text-xs text-mutedForeground">
              Exporta a CSV desde el cliente. Si quieres reportes PDF/Excel del lado backend, se puede agregar un endpoint específico.
            </div>
          </div>

          {/* Tabla de preview */}
          <div className="mt-4 border rounded-xl overflow-hidden bg-card">
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">N° Inventario</th>
                    <th className="px-3 py-2 text-left font-medium">Artículo</th>
                    <th className="px-3 py-2 text-left font-medium">Categoría</th>
                    <th className="px-3 py-2 text-left font-medium">Secretaría</th>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                    <th className="px-3 py-2 text-left font-medium">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((item) => (
                    <tr key={item.id} className="border-t hover:bg-muted/50">
                      <td className="px-3 py-2 font-mono text-xs">{item.numero_inventario}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={item.nombre_articulo}>
                        {item.nombre_articulo}
                      </td>
                      <td className="px-3 py-2 text-mutedForeground">{item.categoria}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${item.secretaria === 'Almacén' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {item.secretaria}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${item.estado_uso === 'en_uso' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.estado_uso === 'en_uso' ? 'En uso' : 'Almacén'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        ${Number(item.costo || 0).toLocaleString('es-MX')}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-mutedForeground">
                        No se encontraron registros con los filtros aplicados
                      </td>
                    </tr>
                  )}
                  {filtered.length > 100 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-center text-xs text-mutedForeground bg-muted/30">
                        Mostrando primeros 100 de {filtered.length} registros. Usa los filtros para reducir resultados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

