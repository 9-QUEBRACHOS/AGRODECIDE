// Consultas que juntan datos de la base y llaman a los cálculos puros.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './baseDatos';
import { calcularCultivo, type ResultadoCultivo } from '../calculos/margen';
import type { Campo, CultivoEnLote, Lote } from '../modelo/tipos';

export interface FilaResultado {
  cultivo: CultivoEnLote;
  lote: Lote;
  campo: Campo | undefined;
  resultado: ResultadoCultivo;
}

/** Resultado económico de todos los cultivos de una campaña (se actualiza solo). */
export function useResultadosCampania(espacioId: string | undefined, campaniaId: string | undefined) {
  return useLiveQuery(async (): Promise<FilaResultado[]> => {
    if (!espacioId || !campaniaId) return [];
    const [cultivos, lotes, campos, alquileres, labores, aplicados, cosechas, ventas] = await Promise.all([
      db.cultivos.where('campaniaId').equals(campaniaId).toArray(),
      db.lotes.where('espacioId').equals(espacioId).toArray(),
      db.campos.where('espacioId').equals(espacioId).toArray(),
      db.alquileres.where('campaniaId').equals(campaniaId).toArray(),
      db.labores.where('espacioId').equals(espacioId).toArray(),
      db.insumosAplicados.where('espacioId').equals(espacioId).toArray(),
      db.cosechas.where('espacioId').equals(espacioId).toArray(),
      db.ventas.where('espacioId').equals(espacioId).toArray(),
    ]);
    const filas: FilaResultado[] = [];
    for (const cultivo of cultivos) {
      const lote = lotes.find((l) => l.id === cultivo.loteId);
      if (!lote) continue;
      const susLabores = labores.filter((l) => l.cultivoEnLoteId === cultivo.id);
      const idsLabores = new Set(susLabores.map((l) => l.id));
      filas.push({
        cultivo,
        lote,
        campo: campos.find((c) => c.id === lote.campoId),
        resultado: calcularCultivo({
          cultivo,
          lote,
          alquiler: alquileres.find((a) => a.loteId === lote.id),
          labores: susLabores,
          insumosAplicados: aplicados.filter((a) => idsLabores.has(a.laborId)),
          cosechas: cosechas.filter((c) => c.cultivoEnLoteId === cultivo.id),
          ventas: ventas.filter((v) => v.cultivoEnLoteId === cultivo.id),
        }),
      });
    }
    return filas;
  }, [espacioId, campaniaId]);
}
