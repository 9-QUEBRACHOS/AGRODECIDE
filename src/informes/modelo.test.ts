import { describe, expect, it } from 'vitest';
import { armarInforme } from './modelo';
import { calcularFilas, type DatosCampania } from '../db/consultas';
import type { Campania, Espacio } from '../modelo/tipos';

const usd = (monto: number) => ({ monto, moneda: 'USD' as const, tipoCambio: 1000 });
const espacio: Espacio = { id: 'E', nombre: 'La Esperanza', esPropio: true, provincia: 'Santa Fe', condicionFiscal: 'otro', monedaReporte: 'USD', unidadGrano: 'qq', creadoEn: '2026-10-13' };
const campania: Campania = { id: 'K', espacioId: 'E', nombre: '2025/26', fechaInicio: '2025-07-01', fechaFin: '2026-06-30' };

const datos: DatosCampania = {
  campos: [{ id: 'C', espacioId: 'E', nombre: 'El Ombú' }],
  lotes: [{ id: 'L', espacioId: 'E', campoId: 'C', nombre: 'Lote 1', hectareas: 100, tenencia: 'alquilado' }],
  alquileres: [{ id: 'A', espacioId: 'E', loteId: 'L', campaniaId: 'K', tipo: 'contrato', modalidad: 'monto_ha', valor: 200, importePorHa: usd(200) }],
  cultivos: [
    { id: 'T', espacioId: 'E', loteId: 'L', campaniaId: 'K', cultivo: 'trigo', ciclo: 'primera', hectareas: 100, porcentajeAlquiler: 50, rindeEstimadoKgHa: 3000, precioEstimado: usd(200) },
    { id: 'S', espacioId: 'E', loteId: 'L', campaniaId: 'K', cultivo: 'soja', ciclo: 'segunda', hectareas: 100, porcentajeAlquiler: 50, rindeEstimadoKgHa: 2500, precioEstimado: usd(300) },
  ],
  insumos: [{ id: 'I', espacioId: 'E', nombre: 'Urea', categoria: 'fertilizante', unidad: 'kg' }],
  labores: [{ id: 'LA', espacioId: 'E', cultivoEnLoteId: 'T', tipo: 'siembra', fecha: '2025-06-10', hectareas: 100, modalidad: 'contratada', costoPorHa: usd(50) }],
  aplicados: [{ id: 'IA', espacioId: 'E', laborId: 'LA', insumoId: 'I', dosisPorHa: 100, precioUnitario: usd(0.7) }],
  cosechas: [{ id: 'CO', espacioId: 'E', cultivoEnLoteId: 'T', fecha: '2025-12-01', kg: 300000 }],
  ventas: [{ id: 'V', espacioId: 'E', cultivoEnLoteId: 'T', fecha: '2025-12-10', kg: 300000, precioPorTn: usd(200), gastosComerciales: [{ concepto: 'Flete', importe: usd(1000) }] }],
};

const op = { moneda: 'USD' as const, tipoCambio: 1000, unidad: 'qq' as const, hoy: new Date(2026, 9, 13) };

describe('armarInforme', () => {
  const inf = armarInforme({ espacio, campania, datos, filas: calcularFilas(datos) }, op);

  it('trae las cuatro tablas y el encabezado', () => {
    expect(inf.tablas.map((t) => t.titulo)).toEqual(['Resultado por cultivo', 'Alquileres por lote', 'Labores e insumos', 'Cosechas y ventas']);
    expect(inf.espacio).toBe('La Esperanza');
    expect(inf.generado).toBe('13/10/2026');
  });

  it('el resumen usa hectáreas físicas y cuadra con los cultivos', () => {
    expect(inf.hectareas).toBe(100);
    expect(inf.hectareasSembradas).toBe(200);
    // trigo: 300 tn × 200 − 1000 = 59.000 ; soja 2da: 250 tn × 300 = 75.000
    // costos: labores 5.000 + urea 7.000 + alquiler 20.000 = 32.000 → margen 102.000
    const margen = inf.resumen.find((r) => r.etiqueta === 'Margen neto')!;
    expect(margen.total).toBeCloseTo(102000, 6);
    expect(margen.porHa).toBeCloseTo(1020, 6);
    expect(inf.resumen.find((r) => r.etiqueta === 'Alquiler')!.total).toBeCloseTo(20000, 6);
  });

  it('labores: una fila por servicio y otra por insumo, con total', () => {
    const t = inf.tablas[2];
    expect(t.filas).toHaveLength(2);
    expect(t.filas[1][4]).toBe('Urea');
    expect(t.total?.[10]).toBeCloseTo(12000, 6);
  });

  it('alquiler por lote en la moneda del informe', () => {
    const t = inf.tablas[1];
    expect(t.filas[0][5]).toBeCloseTo(200, 6);
    expect(t.filas[0][6]).toBeCloseTo(20000, 6);
  });

  it('en pesos convierte con el dólar indicado', () => {
    const enPesos = armarInforme({ espacio, campania, datos, filas: calcularFilas(datos) }, { ...op, moneda: 'ARS', tipoCambio: 1500 });
    expect(enPesos.simboloMoneda).toBe('$');
    expect(enPesos.resumen.find((r) => r.etiqueta === 'Margen neto')!.total).toBeCloseTo(102000 * 1500, 3);
  });
});
