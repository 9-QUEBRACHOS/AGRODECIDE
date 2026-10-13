import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './baseDatos';
import { borrarEspacio, borrarLote, exportarEspacio, importarEspacio, reasignarIds } from './operaciones';

const E = 'esp-1';

async function sembrarDatos() {
  await db.espacios.add({ id: E, nombre: 'La Esperanza', esPropio: true, provincia: 'Santa Fe', condicionFiscal: 'responsable_inscripto', monedaReporte: 'USD', unidadGrano: 'qq', creadoEn: '2026-10-13' });
  await db.campanias.add({ id: 'K', espacioId: E, nombre: '2026/27', fechaInicio: '2026-07-01', fechaFin: '2027-06-30' });
  await db.campos.add({ id: 'C', espacioId: E, nombre: 'El Ombú' });
  await db.lotes.add({ id: 'L', espacioId: E, campoId: 'C', nombre: 'Lote 1', hectareas: 50, tenencia: 'propio' });
  await db.cultivos.add({ id: 'CL', espacioId: E, loteId: 'L', campaniaId: 'K', cultivo: 'maiz', ciclo: 'primera', hectareas: 50, porcentajeAlquiler: 100 });
  await db.insumos.add({ id: 'I', espacioId: E, nombre: 'Urea', categoria: 'fertilizante', unidad: 'kg' });
  await db.labores.add({ id: 'LA', espacioId: E, cultivoEnLoteId: 'CL', tipo: 'fertilizacion', fecha: '2026-10-01', hectareas: 50, modalidad: 'propia' });
  await db.insumosAplicados.add({ id: 'IA', espacioId: E, laborId: 'LA', insumoId: 'I', dosisPorHa: 100, precioUnitario: { monto: 0.7, moneda: 'USD', tipoCambio: 1200 } });
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await sembrarDatos();
});

describe('borrados en cascada', () => {
  it('borrar un lote borra sus cultivos, labores e insumos aplicados', async () => {
    await borrarLote('L');
    expect(await db.cultivos.count()).toBe(0);
    expect(await db.labores.count()).toBe(0);
    expect(await db.insumosAplicados.count()).toBe(0);
    expect(await db.insumos.count()).toBe(1); // el catálogo queda
  });
  it('borrar un espacio no deja nada suyo', async () => {
    await borrarEspacio(E);
    expect(await db.espacios.count()).toBe(0);
    expect(await db.insumos.count()).toBe(0);
  });
});

describe('exportar e importar', () => {
  it('importar crea un espacio nuevo con todas las relaciones intactas', async () => {
    const archivo = JSON.parse(JSON.stringify(await exportarEspacio(E)));
    const nuevoId = await importarEspacio(archivo);
    expect(nuevoId).not.toBe(E);
    expect(await db.espacios.count()).toBe(2);
    const nuevo = await db.espacios.get(nuevoId);
    expect(nuevo?.nombre).toBe('La Esperanza (importado)');
    const lote = await db.lotes.where('espacioId').equals(nuevoId).first();
    const campo = await db.campos.where('espacioId').equals(nuevoId).first();
    expect(lote?.campoId).toBe(campo?.id);
    const labor = await db.labores.where('espacioId').equals(nuevoId).first();
    const aplicado = await db.insumosAplicados.where('espacioId').equals(nuevoId).first();
    const insumo = await db.insumos.where('espacioId').equals(nuevoId).first();
    expect(aplicado?.laborId).toBe(labor?.id);
    expect(aplicado?.insumoId).toBe(insumo?.id);
  });
  it('rechaza archivos que no son de AgroDecide', async () => {
    await expect(importarEspacio({ hola: 1 })).rejects.toThrow('respaldo de AgroDecide');
  });
  it('reasignarIds cambia todos los ids y referencias', async () => {
    const archivo = await exportarEspacio(E);
    let n = 0;
    const r = reasignarIds(archivo, () => `n${n++}`);
    const ids = JSON.stringify(r);
    for (const viejo of ['"esp-1"', '"CL"', '"LA"', '"IA"']) expect(ids).not.toContain(viejo);
  });
});
