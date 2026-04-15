export const SECRETARIAS = [
  'Organización',
  'Finanzas',
  'Asuntos Legales',
  'Transparencia',
  'Fomento al Deporte',
  'Fomento al Ahorro',
  'Pensiones y Jubilaciones',
  'Oficialía Mayor',
  'Actas y Acuerdos',
  'De Interior',
  'Prensa y Propaganda',
  'Trabajo y Conflictos',
  'Patrimonio',
  'Fomento a la Vivienda',
  'Educación y Cultura',
  'Auditoría',
  'Acción Social'
] as const;

export function mergeSecretarias(...lists: Array<Array<string | null | undefined>>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list) {
      const s = (raw || '').trim();
      if (!s) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

