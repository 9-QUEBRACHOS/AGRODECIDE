// Estado global liviano: espacio activo, campaña activa y último tipo de cambio.
// Se recuerda en localStorage (preferencias del dispositivo, no datos del productor).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/baseDatos';
import type { Campania, Espacio } from './modelo/tipos';

const leer = (clave: string) => {
  try { return localStorage.getItem(clave); } catch { return null; }
};
const guardar = (clave: string, valor: string | null) => {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch { /* sin almacenamiento: queda en memoria */ }
};

interface Estado {
  cargando: boolean;
  espacios: Espacio[];
  espacio: Espacio | undefined;
  campanias: Campania[];
  campania: Campania | undefined;
  elegirEspacio: (id: string | null) => void;
  elegirCampania: (id: string | null) => void;
  /** Último tipo de cambio usado (ARS por USD), para precargar formularios y reportes en pesos. */
  tipoCambio: number;
  setTipoCambio: (tc: number) => void;
}

const Contexto = createContext<Estado | null>(null);

export function ProveedorEstado({ children }: { children: ReactNode }) {
  const [espacioId, setEspacioId] = useState<string | null>(() => leer('agrodecide.espacio'));
  const [campaniaId, setCampaniaId] = useState<string | null>(() => leer('agrodecide.campania'));
  const [tipoCambio, setTc] = useState<number>(() => Number(leer('agrodecide.tc')) || 1400);

  const espacios = useLiveQuery(() => db.espacios.orderBy('nombre').toArray(), []);
  const espacio = espacios?.find((e) => e.id === espacioId) ?? espacios?.[0];

  const campanias = useLiveQuery(
    async () => (espacio ? (await db.campanias.where('espacioId').equals(espacio.id).toArray())
      .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)) : []),
    [espacio?.id],
  );
  const campania = campanias?.find((c) => c.id === campaniaId) ?? campanias?.[0];

  const elegirEspacio = useCallback((id: string | null) => {
    setEspacioId(id); guardar('agrodecide.espacio', id);
    setCampaniaId(null); guardar('agrodecide.campania', null);
  }, []);
  const elegirCampania = useCallback((id: string | null) => {
    setCampaniaId(id); guardar('agrodecide.campania', id);
  }, []);
  const setTipoCambio = useCallback((tc: number) => {
    if (!Number.isFinite(tc) || tc <= 0) return;
    setTc(tc); guardar('agrodecide.tc', String(tc));
  }, []);

  // Si el espacio guardado ya no existe, `espacio` cae al primero de la lista (ver arriba).
  // No se borra la preferencia acá: justo después de crear un espacio la lista todavía no lo incluye.

  const valor = useMemo<Estado>(() => ({
    cargando: espacios === undefined || campanias === undefined,
    espacios: espacios ?? [],
    espacio,
    campanias: campanias ?? [],
    campania,
    elegirEspacio,
    elegirCampania,
    tipoCambio,
    setTipoCambio,
  }), [espacios, espacio, campanias, campania, elegirEspacio, elegirCampania, tipoCambio, setTipoCambio]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstado() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useEstado fuera de ProveedorEstado');
  return c;
}

/** Igual que useEstado pero garantiza que hay espacio activo (usar dentro de pantallas con espacio). */
export function useEspacio() {
  const e = useEstado();
  if (!e.espacio) throw new Error('No hay espacio activo');
  return { ...e, espacio: e.espacio };
}
