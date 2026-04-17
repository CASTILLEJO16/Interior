import { useState, useEffect } from 'react';
import { api } from './api';
import { useAuth } from '../state/auth';

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

export function useSecretarias() {
  const { token } = useAuth();
  const [list, setList] = useState<string[]>([...SECRETARIAS]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.secretarias(token).then(res => {
      if (active && res.success && res.data) {
        setList(prev => mergeSecretarias(prev, res.data || []));
      }
    }).catch(console.error);
    return () => { active = false; };
  }, [token]);

  return list;
}
