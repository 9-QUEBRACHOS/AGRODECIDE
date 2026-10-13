import { describe, expect, it } from 'vitest';
import { alquilerTotalLote, calcularCultivo, costoInsumos, costoLabores, resumir, type EntradaCultivo } from './margen';
import { aUsd, deUsd } from './moneda';
import type { AlquilerLote, CultivoEnLote, Labor, Lote } from '../modelo/tipos';

const usd = (monto: number) => ({ monto, moneda: 'USD' as const, tipoCambio: 1200 });
const ars = (monto: number, tipoCambio = 1200) => ({ monto, moneda: 'ARS' as const, tipoCambio });

const lote: Lote = { id: 'L1', espacioId: 'E', campoId: 'C', nombre: 'Lote 1', hectareas: 100, tenencia: 'alquilado' };
const cultivo: CultivoEnLote = {
  id: 'CL1', espacioId: 'E', loteId: 'L1', campaniaId: 'K', cultivo: 'soja', ciclo: 'primera',
  hectareas: 100, porcentajeAlquiler: 100, rindeEstimadoKgHa: 3200, precioEstimado: usd(310),
};
const labores: Labor[] = [
  { id: 'LA1', espacioId: 'E', cultivoEnLoteId: 'CL1', tipo: 'siembra', fecha: '2026-11-10', hectareas: 100, modalidad: 'contratada', costoPorHa: usd(45) },
  { id: 'LA2', espacioId: 'E', cultivoEnLoteId: 'CL1', tipo: 'pulverizacion', fecha: '2026-12-01', hectareas: 100, modalidad: 'contratada', costoPorHa: ars(12000) },
];
const aplicados = [
  { id: 'IA1', espacioId: 'E', laborId: 'LA1', insumoId: 'semilla', dosisPorHa: 70, precioUnitario: usd(0.6) },
  { id: 'IA2', espacioId: 'E', laborId: 'LA2', insumoId: 'glifo', dosisPorHa: 3, precioUnitario: usd(4) },
];
const alquiler: AlquilerLote = {
  id: 'A1', espacioId: 'E', loteId: 'L1', campaniaId: 'K', tipo: 'contrato',
  modalidad: 'qq_soja_ha', valor: 12, precioSojaReferencia: usd(300),
};

const base: EntradaCultivo = {
  cultivo, lote, alquiler, labores, insumosAplicados: aplicados,
  cosechas: [{ id: 'CO1', espacioId: 'E', cultivoEnLoteId: 'CL1', fecha: '2027-04-20', kg: 350000 }],
  ventas: [{
    id: 'V1', espacioId: 'E', cultivoEnLoteId: 'CL1', fecha: '2027-05-02', kg: 200000, precioPorTn: usd(300),
    gastosComerciales: [{ concepto: 'Flete', importe: usd(2000) }, { concepto: 'Comisión', importe: usd(1200) }],
  }],
};

describe('moneda', () => {
  it('convierte pesos a dólares con el tipo de cambio del movimiento', () => {
    expect(aUsd(ars(12000, 1200))).toBe(10);
    expect(aUsd(usd(45))).toBe(45);
    expect(aUsd(ars(100, 0))).toBe(0);
    expect(deUsd(10, 'ARS', 1300)).toBe(13000);
  });
});

describe('costos directos', () => {
  it('suma labores e insumos por hectárea', () => {
    expect(costoLabores(labores)).toBe(4500 + 1000);
    expect(costoInsumos(labores, aplicados)).toBe(4200 + 1200);
  });
  it('ignora insumos de labores de otro cultivo', () => {
    expect(costoInsumos(labores, [{ ...aplicados[0], laborId: 'otra' }])).toBe(0);
  });
});

describe('alquiler', () => {
  it('qq de soja por ha', () => {
    expect(alquilerTotalLote(alquiler, 100)).toBe(36000);
  });
  it('monto fijo por ha en pesos', () => {
    expect(alquilerTotalLote({ ...alquiler, modalidad: 'monto_ha', valor: 0, importePorHa: ars(240000) }, 100)).toBe(20000);
  });
});

describe('calcularCultivo — caso real con cosecha y venta parcial', () => {
  const r = calcularCultivo(base);
  it('costos', () => {
    expect(r.esProyectado).toBe(false);
    expect(r.costoDirectoUsd).toBe(10900);
    expect(r.alquilerUsd).toBe(36000);
    expect(r.costoTotalUsd).toBe(46900);
    expect(r.costoTotalPorHaUsd).toBe(469);
    expect(r.costoPorKgUsd).toBeCloseTo(46900 / 350000, 10);
  });
  it('ingresos: ventas netas + lo no vendido al precio estimado', () => {
    expect(r.ingresoNetoVentasUsd).toBe(56800);
    expect(r.kgSinVender).toBe(150000);
    expect(r.valorSinVenderUsd).toBeCloseTo(46500, 6);
    expect(r.ingresoTotalUsd).toBeCloseTo(103300, 6);
  });
  it('márgenes y rinde de indiferencia', () => {
    expect(r.margenBrutoUsd).toBeCloseTo(92400, 6);
    expect(r.margenNetoUsd).toBeCloseTo(56400, 6);
    expect(r.margenNetoPorHaUsd).toBeCloseTo(564, 6);
    expect(r.rindeIndiferenciaKgHa).toBeCloseTo(469 / (103300 / 350000), 6);
    expect(r.margenNetoSinOportunidadUsd).toBeNull();
    expect(r.avisos).toEqual([]);
  });
});

describe('calcularCultivo — proyectado', () => {
  it('usa rinde y precio estimados si no hay cosecha', () => {
    const r = calcularCultivo({ ...base, cosechas: [], ventas: [] });
    expect(r.esProyectado).toBe(true);
    expect(r.kgProduccion).toBe(320000);
    expect(r.ingresoTotalUsd).toBeCloseTo(99200, 6);
    expect(r.margenNetoUsd).toBeCloseTo(99200 - 10900 - 36000, 6);
  });
  it('sin precio ni ventas: no inventa ingresos', () => {
    const r = calcularCultivo({ ...base, cultivo: { ...cultivo, precioEstimado: undefined }, cosechas: [], ventas: [] });
    expect(r.ingresoTotalUsd).toBeNull();
    expect(r.margenNetoUsd).toBeNull();
    expect(r.rindeIndiferenciaKgHa).toBeNull();
    expect(r.avisos).toContain('sin_precio');
    expect(r.costoTotalUsd).toBe(46900);
  });
  it('sin rinde ni cosecha: avisa y no divide por cero', () => {
    const r = calcularCultivo({ ...base, cultivo: { ...cultivo, rindeEstimadoKgHa: undefined }, cosechas: [], ventas: [] });
    expect(r.avisos).toContain('sin_rinde');
    expect(r.costoPorKgUsd).toBeNull();
  });
});

describe('calcularCultivo — campo propio con alquiler de referencia', () => {
  it('muestra margen con y sin costo de oportunidad', () => {
    const r = calcularCultivo({ ...base, lote: { ...lote, tenencia: 'propio' }, alquiler: { ...alquiler, tipo: 'referencia' } });
    expect(r.alquilerEsReferencia).toBe(true);
    expect(r.margenNetoUsd).toBeCloseTo(56400, 6);
    expect(r.margenNetoSinOportunidadUsd).toBeCloseTo(92400, 6);
  });
});

describe('calcularCultivo — doble cultivo y % de cosecha', () => {
  it('reparte el alquiler según el porcentaje del cultivo', () => {
    const r = calcularCultivo({ ...base, cultivo: { ...cultivo, porcentajeAlquiler: 50 } });
    expect(r.alquilerUsd).toBe(18000);
  });
  it('alquiler a porcentaje: % de lo producido valuado al precio efectivo', () => {
    const r = calcularCultivo({ ...base, alquiler: { ...alquiler, modalidad: 'porcentaje_cosecha', valor: 30 } });
    // 30% de 350.000 kg × (103.300 / 350.000) USD/kg = 30.990 USD
    expect(r.alquilerUsd).toBeCloseTo(30990, 6);
    // Rinde de indiferencia: costo sin alquiler por ha / (precio × 70%)
    expect(r.rindeIndiferenciaKgHa).toBeCloseTo((10900 / 100) / ((103300 / 350000) * 0.7), 6);
  });
  it('el costo de oportunidad depende de la tenencia actual del lote', () => {
    const r = calcularCultivo({ ...base, lote: { ...lote, tenencia: 'propio' } });
    expect(r.alquilerEsReferencia).toBe(true);
  });
  it('avisa si se vendió más de lo cosechado', () => {
    const r = calcularCultivo({ ...base, cosechas: [{ ...base.cosechas[0], kg: 100000 }] });
    expect(r.avisos).toContain('vendido_mas_que_cosechado');
    expect(r.kgSinVender).toBe(0);
  });
});

describe('resumir', () => {
  it('suma cultivos y marca incompleto si falta un precio', () => {
    const a = calcularCultivo(base);
    const b = calcularCultivo({ ...base, cultivo: { ...cultivo, precioEstimado: undefined }, cosechas: [], ventas: [] });
    expect(resumir([a, a]).margenNetoUsd).toBeCloseTo(112800, 6);
    const incompleto = resumir([a, b]);
    expect(incompleto.margenNetoUsd).toBeNull();
    expect(incompleto.cultivosSinPrecio).toBe(1);
    expect(incompleto.costoTotalUsd).toBe(93800);
    // doble cultivo en 100 ha físicas: el margen por ha se calcula sobre 100, no 200
    const doble = resumir([a, a], 100);
    expect(doble.hectareasSembradas).toBe(200);
    expect(doble.margenNetoPorHaUsd).toBeCloseTo(1128, 6);
  });
});
