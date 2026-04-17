// Helper para formatear fechas en zona horaria de Tijuana/Mexico
// El backend guarda en UTC, así que tratamos las fechas como UTC y convertimos a local

// Función para convertir fecha UTC de SQLite a hora local de Tijuana
function sqliteUtcToTijuana(dateStr: string): Date {
  // El backend devuelve formato: "2026-04-16 18:27:00" (hora UTC sin indicador de zona)
  // Necesitamos convertirla manualmente porque SQLite no incluye 'Z'
  
  // Parseamos manualmente: YYYY-MM-DD HH:MM:SS
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return new Date(dateStr);
  }
  
  const [, year, month, day, hour, minute, second] = match;
  
  // Creamos una fecha en UTC
  const utcDate = new Date(Date.UTC(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  ));
  
  return utcDate;
}

export function formatDateTijuana(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  
  const date = sqliteUtcToTijuana(dateStr);
  
  return date.toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Tijuana'
  });
}

export function formatDateOnlyTijuana(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  
  const date = sqliteUtcToTijuana(dateStr);
  
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Tijuana'
  });
}
