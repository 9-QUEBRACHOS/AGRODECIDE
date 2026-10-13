// Cálculo de costos y márgenes de un cultivo en lote (ESPECIFICACION.md, sección 6).
// Funciones puras: reciben datos y devuelven resultados. Todo en USD.
import type {
  AlquilerLote, Cosecha, CultivoEnLote, InsumoAplicado, Labor, Lote, Venta,
} from '../modelo/tipos';
import { aUsd, dividir } from './moneda';

export interface EntradaCultivo {
  cultivo: CultivoEnLote;
  lote: Lote;
  alquiler?: AlquilerLote;
  labores: Labor[];
  insumosAplicados: InsumoAplicado[];
  cosechas: Cosecha[];
  ventas: Venta[];
  /** Gastos de estructura ya prorrateados a este cultivo (fase 2). */
  estructuraAsignadaUsd?: number;
}

export type Aviso =
  | 'sin_precio'          // no hay precio estimado ni ventas: no se puede valuar la producción
  | 'sin_rinde'           // no hay cosecha ni rinde estimado
  | 'vendido_mas_que_cosechado'
  | 'alquiler_sin_precio_soja';

export interface ResultadoCultivo {
  hectareas: number;
  esProyectado: boolean;            // true si todavía no hay cosecha cargada
  // Costos
  costoLaboresUsd: number;
  costoInsumosUsd: number;
  costoDirectoUsd: number;
  alquilerUsd: number;              // contrato o referencia, según el lote
  alquilerEsReferencia: boolean;    // true = costo de oportunidad (lote propio)
  estructuraUsd: number;
  costoTotalUsd: number;
  costoDirectoPorHaUsd: number | null;
  costoTotalPorHaUsd: number | null;
  costoPorKgUsd: number | null;
  // Producción
  kgProduccion: number;             // cosechado (real) o estimado (proyectado)
  rindeKgHa: number | null;
  kgVendidos: number;
  kgSinVender: number;
  // Precio e ingresos
  ingresoBrutoVentasUsd: number;
  gastosComercialesUsd: number;
  ingresoNetoVentasUsd: number;
  precioReferenciaKgUsd: number | null;   // para valuar lo no vendido
  valorSinVenderUsd: number | null;
  ingresoTotalUsd: number | null;
  precioEfectivoKgUsd: number | null;     // ingreso total / kg producidos
  // Márgenes
  margenBrutoUsd: number | null;
  margenNetoUsd: number | null;
  /** Solo si el alquiler es de referencia: margen sin restar el costo de oportunidad. */
  margenNetoSinOportunidadUsd: number | null;
  margenNetoPorHaUsd: number | null;
  rindeIndiferenciaKgHa: number | null;
  avisos: Aviso[];
}

/** Costo de las labores: Σ costoPorHa × hectáreas de la labor. */
export function costoLabores(labores: Labor[]): number {
  return labores.reduce((s, l) => s + aUsd(l.costoPorHa) * (l.hectareas || 0), 0);
}

/** Costo de insumos: Σ dosis/ha × precio unitario × hectáreas de la labor donde se aplicó. */
export function costoInsumos(labores: Labor[], aplicados: InsumoAplicado[]): number {
  const haPorLabor = new Map(labores.map((l) => [l.id, l.hectareas || 0]));
  return aplicados.reduce((s, a) => {
    const ha = haPorLabor.get(a.laborId);
    if (ha === undefined) return s; // insumo de una labor que no es de este cultivo
    return s + (a.dosisPorHa || 0) * aUsd(a.precioUnitario) * ha;
  }, 0);
}

/**
 * Alquiler total del lote en la campaña, para las modalidades que no dependen de la cosecha.
 * `porcentaje_cosecha` se calcula por cultivo (ver calcularCultivo).
 */
export function alquilerTotalLote(alquiler: AlquilerLote | undefined, hectareasLote: number): number {
  if (!alquiler) return 0;
  switch (alquiler.modalidad) {
    case 'monto_ha':
      return aUsd(alquiler.importePorHa) * hectareasLote;
    case 'qq_soja_ha':
      // valor qq/ha × 100 kg × ha × precio USD/tn ÷ 1000
      return (alquiler.valor * 100 * hectareasLote * aUsd(alquiler.precioSojaReferencia)) / 1000;
    case 'porcentaje_cosecha':
      return 0;
  }
}

export function calcularCultivo(e: EntradaCultivo): ResultadoCultivo {
  const avisos: Aviso[] = [];
  const ha = e.cultivo.hectareas || 0;

  // --- Costos directos
  const costoLaboresUsd = costoLabores(e.labores);
  const costoInsumosUsd = costoInsumos(e.labores, e.insumosAplicados);
  const costoDirectoUsd = costoLaboresUsd + costoInsumosUsd;

  // --- Producción: real si hay cosecha, si no estimada
  const kgCosechados = e.cosechas.reduce((s, c) => s + (c.kg || 0), 0);
  const esProyectado = kgCosechados === 0;
  const kgProduccion = esProyectado ? (e.cultivo.rindeEstimadoKgHa ?? 0) * ha : kgCosechados;
  if (kgProduccion === 0) avisos.push('sin_rinde');

  // --- Ventas
  const kgVendidos = e.ventas.reduce((s, v) => s + (v.kg || 0), 0);
  const ingresoBrutoVentasUsd = e.ventas.reduce((s, v) => s + ((v.kg || 0) * aUsd(v.precioPorTn)) / 1000, 0);
  const gastosComercialesUsd = e.ventas.reduce(
    (s, v) => s + v.gastosComerciales.reduce((g, gc) => g + aUsd(gc.importe), 0), 0,
  );
  const ingresoNetoVentasUsd = ingresoBrutoVentasUsd - gastosComercialesUsd;
  if (!esProyectado && kgVendidos > kgCosechados) avisos.push('vendido_mas_que_cosechado');

  // --- Precio de referencia para lo no vendido: el estimado, o si no hay, el promedio neto de ventas
  const precioPromedioVentaKg = kgVendidos > 0 ? ingresoNetoVentasUsd / kgVendidos : null;
  const precioEstimadoKg = e.cultivo.precioEstimado ? aUsd(e.cultivo.precioEstimado) / 1000 : null;
  const precioReferenciaKgUsd = precioEstimadoKg && precioEstimadoKg > 0 ? precioEstimadoKg : precioPromedioVentaKg;

  const kgSinVender = Math.max(0, kgProduccion - kgVendidos);
  let valorSinVenderUsd: number | null;
  if (kgSinVender === 0) valorSinVenderUsd = 0;
  else if (precioReferenciaKgUsd === null) { valorSinVenderUsd = null; avisos.push('sin_precio'); }
  else valorSinVenderUsd = kgSinVender * precioReferenciaKgUsd;

  const ingresoTotalUsd = valorSinVenderUsd === null ? null : ingresoNetoVentasUsd + valorSinVenderUsd;
  const precioEfectivoKgUsd = ingresoTotalUsd === null ? null : dividir(ingresoTotalUsd, kgProduccion);

  // --- Alquiler
  let alquilerUsd = 0;
  if (e.alquiler) {
    if (e.alquiler.modalidad === 'porcentaje_cosecha') {
      // Cada cultivo entrega su % de lo que produce, valuado a su precio efectivo.
      const precio = precioEfectivoKgUsd ?? precioReferenciaKgUsd ?? 0;
      alquilerUsd = (kgProduccion * e.alquiler.valor) / 100 * precio;
    } else {
      if (e.alquiler.modalidad === 'qq_soja_ha' && aUsd(e.alquiler.precioSojaReferencia) === 0) {
        avisos.push('alquiler_sin_precio_soja');
      }
      alquilerUsd = alquilerTotalLote(e.alquiler, e.lote.hectareas) * (e.cultivo.porcentajeAlquiler ?? 100) / 100;
    }
  }
  const alquilerEsReferencia = e.alquiler?.tipo === 'referencia';

  // --- Totales
  const estructuraUsd = e.estructuraAsignadaUsd ?? 0;
  const costoTotalUsd = costoDirectoUsd + alquilerUsd + estructuraUsd;

  const margenBrutoUsd = ingresoTotalUsd === null ? null : ingresoTotalUsd - costoDirectoUsd;
  const margenNetoUsd = margenBrutoUsd === null ? null : margenBrutoUsd - alquilerUsd - estructuraUsd;
  const margenNetoSinOportunidadUsd =
    alquilerEsReferencia && margenBrutoUsd !== null ? margenBrutoUsd - estructuraUsd : null;

  const costoTotalPorHaUsd = dividir(costoTotalUsd, ha);
  const rindeIndiferenciaKgHa =
    costoTotalPorHaUsd !== null && precioEfectivoKgUsd ? costoTotalPorHaUsd / precioEfectivoKgUsd : null;

  return {
    hectareas: ha,
    esProyectado,
    costoLaboresUsd,
    costoInsumosUsd,
    costoDirectoUsd,
    alquilerUsd,
    alquilerEsReferencia,
    estructuraUsd,
    costoTotalUsd,
    costoDirectoPorHaUsd: dividir(costoDirectoUsd, ha),
    costoTotalPorHaUsd,
    costoPorKgUsd: dividir(costoTotalUsd, kgProduccion),
    kgProduccion,
    rindeKgHa: dividir(kgProduccion, ha),
    kgVendidos,
    kgSinVender,
    ingresoBrutoVentasUsd,
    gastosComercialesUsd,
    ingresoNetoVentasUsd,
    precioReferenciaKgUsd,
    valorSinVenderUsd,
    ingresoTotalUsd,
    precioEfectivoKgUsd,
    margenBrutoUsd,
    margenNetoUsd,
    margenNetoSinOportunidadUsd,
    margenNetoPorHaUsd: margenNetoUsd === null ? null : dividir(margenNetoUsd, ha),
    rindeIndiferenciaKgHa,
    avisos,
  };
}

export interface ResumenCampania {
  hectareas: number;
  costoTotalUsd: number;
  ingresoTotalUsd: number | null;
  margenNetoUsd: number | null;
  margenNetoPorHaUsd: number | null;
  cultivosSinPrecio: number;
}

/** Suma los resultados de varios cultivos. Si alguno no tiene precio, los ingresos quedan incompletos. */
export function resumir(resultados: ResultadoCultivo[]): ResumenCampania {
  const hectareas = resultados.reduce((s, r) => s + r.hectareas, 0);
  const costoTotalUsd = resultados.reduce((s, r) => s + r.costoTotalUsd, 0);
  const cultivosSinPrecio = resultados.filter((r) => r.ingresoTotalUsd === null).length;
  const conPrecio = cultivosSinPrecio === 0;
  const ingresoTotalUsd = conPrecio ? resultados.reduce((s, r) => s + (r.ingresoTotalUsd ?? 0), 0) : null;
  const margenNetoUsd = conPrecio ? resultados.reduce((s, r) => s + (r.margenNetoUsd ?? 0), 0) : null;
  return {
    hectareas,
    costoTotalUsd,
    ingresoTotalUsd,
    margenNetoUsd,
    margenNetoPorHaUsd: margenNetoUsd === null ? null : dividir(margenNetoUsd, hectareas),
    cultivosSinPrecio,
  };
}
