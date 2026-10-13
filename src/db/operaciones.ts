// Operaciones sobre la base: borrados en cascada, exportar e importar espacios.
import { db, nuevoId, TABLAS_DEL_ESPACIO, type TablaDelEspacio } from './baseDatos';
import type { Espacio } from '../modelo/tipos';

const todasLasTablas = () => [db.espacios, ...TABLAS_DEL_ESPACIO.map((t) => db[t])];

// ---------- Borrados en cascada ----------
export async function borrarLabor(laborId: string) {
  await db.transaction('rw', db.labores, db.insumosAplicados, async () => {
    await db.insumosAplicados.where('laborId').equals(laborId).delete();
    await db.labores.delete(laborId);
  });
}

export async function borrarCultivo(cultivoId: string) {
  await db.transaction('rw', todasLasTablas(), async () => {
    const labores = await db.labores.where('cultivoEnLoteId').equals(cultivoId).primaryKeys();
    await db.insumosAplicados.where('laborId').anyOf(labores).delete();
    await db.labores.bulkDelete(labores);
    await db.cosechas.where('cultivoEnLoteId').equals(cultivoId).delete();
    await db.ventas.where('cultivoEnLoteId').equals(cultivoId).delete();
    await db.movimientosStock.where('cultivoEnLoteId').equals(cultivoId).delete();
    const reservas = await db.reservas.where('origenCultivoEnLoteId').equals(cultivoId).primaryKeys();
    await db.suministros.where('reservaId').anyOf(reservas).delete();
    await db.reservas.bulkDelete(reservas);
    const cultivo = await db.cultivos.get(cultivoId);
    await db.cultivos.delete(cultivoId);
    // Los cultivos que quedan en el lote vuelven a absorber el 100% del alquiler, en la misma proporción.
    if (cultivo) {
      const quedan = await db.cultivos.where('loteId').equals(cultivo.loteId).filter((c) => c.campaniaId === cultivo.campaniaId).toArray();
      const suma = quedan.reduce((s, c) => s + (c.porcentajeAlquiler ?? 0), 0);
      for (const c of quedan) {
        await db.cultivos.update(c.id, { porcentajeAlquiler: suma > 0 ? (c.porcentajeAlquiler / suma) * 100 : 100 / quedan.length });
      }
    }
  });
}

export async function borrarLote(loteId: string) {
  await db.transaction('rw', todasLasTablas(), async () => {
    const cultivos = await db.cultivos.where('loteId').equals(loteId).primaryKeys();
    for (const c of cultivos) await borrarCultivo(c);
    await db.alquileres.where('loteId').equals(loteId).delete();
    await db.lotes.delete(loteId);
  });
}

export async function borrarCampo(campoId: string) {
  await db.transaction('rw', todasLasTablas(), async () => {
    const lotes = await db.lotes.where('campoId').equals(campoId).primaryKeys();
    for (const l of lotes) await borrarLote(l);
    await db.campos.delete(campoId);
  });
}

export async function borrarCampania(campaniaId: string) {
  await db.transaction('rw', todasLasTablas(), async () => {
    const cultivos = await db.cultivos.where('campaniaId').equals(campaniaId).primaryKeys();
    for (const c of cultivos) await borrarCultivo(c);
    await db.alquileres.where('campaniaId').equals(campaniaId).delete();
    await db.gastosEstructura.where('campaniaId').equals(campaniaId).delete();
    await db.campanias.delete(campaniaId);
  });
}

export async function borrarEspacio(espacioId: string) {
  await db.transaction('rw', todasLasTablas(), async () => {
    for (const t of TABLAS_DEL_ESPACIO) {
      await db[t].where('espacioId').equals(espacioId).delete();
    }
    await db.espacios.delete(espacioId);
  });
}

/** Cuántas veces se usó un insumo en labores (para no borrar uno en uso). */
export async function usosDeInsumo(insumoId: string) {
  return db.insumosAplicados.filter((a) => a.insumoId === insumoId).count();
}

// ---------- Exportar / importar ----------
export const FORMATO_EXPORTACION = 'agrodecide-espacio';
export const VERSION_EXPORTACION = 1;

export interface ArchivoEspacio {
  formato: typeof FORMATO_EXPORTACION;
  version: number;
  exportadoEn: string;
  espacio: Espacio;
  datos: Record<TablaDelEspacio, Record<string, unknown>[]>;
}

export async function exportarEspacio(espacioId: string): Promise<ArchivoEspacio> {
  const espacio = await db.espacios.get(espacioId);
  if (!espacio) throw new Error('No se encontró el espacio');
  const datos = {} as ArchivoEspacio['datos'];
  for (const t of TABLAS_DEL_ESPACIO) {
    datos[t] = (await db[t].where('espacioId').equals(espacioId).toArray()) as unknown as Record<string, unknown>[];
  }
  return {
    formato: FORMATO_EXPORTACION,
    version: VERSION_EXPORTACION,
    exportadoEn: new Date().toISOString(),
    espacio,
    datos,
  };
}

/**
 * Reemplaza todos los IDs por IDs nuevos (para que importar un archivo dos veces,
 * o en otro dispositivo, nunca pise datos existentes). Función pura.
 */
export function reasignarIds(archivo: ArchivoEspacio, generarId: () => string = nuevoId): ArchivoEspacio {
  const mapa = new Map<string, string>();
  const nuevo = (viejo: string) => {
    if (!mapa.has(viejo)) mapa.set(viejo, generarId());
    return mapa.get(viejo)!;
  };
  nuevo(archivo.espacio.id);
  for (const t of TABLAS_DEL_ESPACIO) for (const fila of archivo.datos[t] ?? []) nuevo(fila.id as string);

  const remapear = (fila: Record<string, unknown>) => {
    const copia: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(fila)) {
      if ((clave === 'id' || clave.endsWith('Id')) && typeof valor === 'string' && mapa.has(valor)) {
        copia[clave] = mapa.get(valor);
      } else if (clave.endsWith('Ids') && Array.isArray(valor)) {
        copia[clave] = valor.map((v) => (typeof v === 'string' && mapa.has(v) ? mapa.get(v) : v));
      } else {
        copia[clave] = valor;
      }
    }
    return copia;
  };

  const datos = {} as ArchivoEspacio['datos'];
  for (const t of TABLAS_DEL_ESPACIO) datos[t] = (archivo.datos[t] ?? []).map(remapear);
  return { ...archivo, espacio: remapear(archivo.espacio as unknown as Record<string, unknown>) as unknown as Espacio, datos };
}

export function validarArchivo(contenido: unknown): ArchivoEspacio {
  const a = contenido as ArchivoEspacio;
  if (!a || a.formato !== FORMATO_EXPORTACION || !a.espacio || !a.datos || typeof a.version !== 'number') {
    throw new Error('El archivo no es un respaldo de AgroDecide.');
  }
  if (a.version > VERSION_EXPORTACION) {
    throw new Error('El archivo es de una versión más nueva de AgroDecide. Actualizá la app.');
  }
  return a;
}

/** Importa un espacio como espacio nuevo. Devuelve el id del espacio creado. */
export async function importarEspacio(contenido: unknown): Promise<string> {
  const archivo = reasignarIds(validarArchivo(contenido));
  const nombresExistentes = new Set((await db.espacios.toArray()).map((e) => e.nombre));
  let nombre = archivo.espacio.nombre;
  if (nombresExistentes.has(nombre)) nombre = `${nombre} (importado)`;
  await db.transaction('rw', todasLasTablas(), async () => {
    await db.espacios.add({ ...archivo.espacio, nombre });
    for (const t of TABLAS_DEL_ESPACIO) {
      const filas = archivo.datos[t];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (filas?.length) await (db[t] as any).bulkAdd(filas);
    }
  });
  return archivo.espacio.id;
}
