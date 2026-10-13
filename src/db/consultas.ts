// Consultas que juntan datos de la base y llaman a los cálculos puros.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './baseDatos';
import { calcularCultivo, type ResultadoCultivo } from '../calculos/margen';
import type {
  AlquilerLote, Campania, Campo, Cosecha, CultivoEnLote, Espacio, Insumo, InsumoAplicado, Labor, Lote, Venta,
} from '../modelo/tipos';

export interface FilaResultado {
  cultivo: CultivoEnLote;
  lote: Lote;
  campo: Campo | undefined;
  resultado: ResultadoCultivo;
}

/** Todos los datos de una campaña, ya filtrados. */
export interface DatosCampania {
  cultivos: CultivoEnLote[];
  lotes: Lote[];
  campos: Campo[];
  alquileres: AlquilerLote[];
  labores: Labor[];
  aplicados: InsumoAplicado[];
  insumos: Insumo[];
  cosechas: Cosecha[];
  ventas: Venta[];
}

export async function leerCampania(espacioId: string, campaniaId: string): Promise<DatosCampania> {
  const cultivos = await db.cultivos.where('campaniaId').equals(campaniaId).toArray();
  const ids = new Set(cultivos.map((c) => c.id));
  const [lotes, campos, alquileres, labores, aplicados, insumos, cosechas, ventas] = await Promise.all([
    db.lotes.where('espacioId').equals(espacioId).toArray(),
    db.campos.where('espacioId').equals(espacioId).toArray(),
    db.alquileres.where('campaniaId').equals(campaniaId).toArray(),
    db.labores.where('espacioId').equals(espacioId).toArray(),
    db.insumosAplicados.where('espacioId').equals(espacioId).toArray(),
    db.insumos.where('espacioId').equals(espacioId).toArray(),
    db.cosechas.where('espacioId').equals(espacioId).toArray(),
    db.ventas.where('espacioId').equals(espacioId).toArray(),
  ]);
  const susLabores = labores.filter((l) => ids.has(l.cultivoEnLoteId));
  const idsLabores = new Set(susLabores.map((l) => l.id));
  return {
    cultivos, lotes, campos, alquileres, insumos,
    labores: susLabores,
    aplicados: aplicados.filter((a) => idsLabores.has(a.laborId)),
    cosechas: cosechas.filter((c) => ids.has(c.cultivoEnLoteId)),
    ventas: ventas.filter((v) => ids.has(v.cultivoEnLoteId)),
  };
}

/** Calcula el resultado de cada cultivo. Función pura. */
export function calcularFilas(d: DatosCampania): FilaResultado[] {
  const filas: FilaResultado[] = [];
  for (const cultivo of d.cultivos) {
    const lote = d.lotes.find((l) => l.id === cultivo.loteId);
    if (!lote) continue;
    const susLabores = d.labores.filter((l) => l.cultivoEnLoteId === cultivo.id);
    const idsLabores = new Set(susLabores.map((l) => l.id));
    filas.push({
      cultivo,
      lote,
      campo: d.campos.find((c) => c.id === lote.campoId),
      resultado: calcularCultivo({
        cultivo,
        lote,
        alquiler: d.alquileres.find((a) => a.loteId === lote.id),
        labores: susLabores,
        insumosAplicados: d.aplicados.filter((a) => idsLabores.has(a.laborId)),
        cosechas: d.cosechas.filter((c) => c.cultivoEnLoteId === cultivo.id),
        ventas: d.ventas.filter((v) => v.cultivoEnLoteId === cultivo.id),
      }),
    });
  }
  return filas;
}

/** Resultado económico de todos los cultivos de una campaña (se actualiza solo). */
export function useResultadosCampania(espacioId: string | undefined, campaniaId: string | undefined) {
  return useLiveQuery(async (): Promise<FilaResultado[]> => {
    if (!espacioId || !campaniaId) return [];
    return calcularFilas(await leerCampania(espacioId, campaniaId));
  }, [espacioId, campaniaId]);
}

/** Todo lo necesario para armar un informe. */
export async function leerParaInforme(espacio: Espacio, campania: Campania) {
  const datos = await leerCampania(espacio.id, campania.id);
  return { espacio, campania, datos, filas: calcularFilas(datos) };
}
