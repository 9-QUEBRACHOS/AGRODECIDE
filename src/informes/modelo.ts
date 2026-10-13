// Arma el contenido del informe de campaña como tablas. Función pura (testeable),
// independiente de si después se dibuja en Excel o en PDF.
import { aUsd, deUsd } from '../calculos/moneda';
import { alquilerTotalLote, resumir } from '../calculos/margen';
import type { DatosCampania, FilaResultado } from '../db/consultas';
import { CULTIVOS, LABORES, MODALIDADES_ALQUILER, UNIDADES_INSUMO } from '../modelo/etiquetas';
import type { Campania, CultivoEnLote, Espacio, Importe, Moneda, UnidadGrano } from '../modelo/tipos';

export type TipoColumna = 'texto' | 'dinero' | 'numero' | 'decimal' | 'fecha' | 'porcentaje';

export interface Columna {
  titulo: string;
  tipo: TipoColumna;
  ancho: number; // ancho relativo (caracteres aprox.)
}

export type Celda = string | number | null;

export interface Tabla {
  titulo: string;
  descripcion?: string;
  columnas: Columna[];
  filas: Celda[][];
  total?: Celda[];
}

export interface Informe {
  titulo: string;
  espacio: string;
  campania: string;
  generado: string;      // dd/mm/aaaa
  moneda: Moneda;
  simboloMoneda: string; // "US$" o "$"
  tipoCambio: number;
  unidad: UnidadGrano;
  resumen: { etiqueta: string; porHa: number | null; total: number | null; destacado?: boolean }[];
  hectareas: number;
  hectareasSembradas: number;
  notas: string[];
  tablas: Tabla[];
}

export interface OpcionesInforme {
  moneda: Moneda;
  tipoCambio: number;
  unidad: UnidadGrano;
  hoy: Date;
}

const fechaAR = (iso?: string) => {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};
const nombreCultivo = (c: CultivoEnLote) =>
  (c.cultivo === 'otro' ? c.nombreCultivo || 'Otro' : CULTIVOS[c.cultivo]) + (c.ciclo === 'segunda' ? ' 2da' : '');

export function armarInforme(
  entrada: { espacio: Espacio; campania: Campania; datos: DatosCampania; filas: FilaResultado[] },
  op: OpcionesInforme,
): Informe {
  const { espacio, campania, datos } = entrada;
  const m = (usd: number | null | undefined) => (usd === null || usd === undefined || !Number.isFinite(usd) ? null : deUsd(usd, op.moneda, op.tipoCambio));
  const imp = (i: Importe | undefined) => (i ? m(aUsd(i)) : null);
  const f = op.unidad === 'qq' ? 100 : 1000;
  const u = op.unidad;
  const s = op.moneda === 'USD' ? 'US$' : '$';

  const filas = [...entrada.filas].sort((a, b) =>
    (a.campo?.nombre ?? '').localeCompare(b.campo?.nombre ?? '') || a.lote.nombre.localeCompare(b.lote.nombre) ||
    a.cultivo.ciclo.localeCompare(b.cultivo.ciclo));
  const lugar = (loteId: string) => {
    const lote = datos.lotes.find((l) => l.id === loteId);
    const campo = datos.campos.find((c) => c.id === lote?.campoId);
    return { lote, campo, texto: `${lote?.nombre ?? ''}${campo ? ` (${campo.nombre})` : ''}` };
  };

  // ---------- Resumen
  const haFisicas = [...new Map(filas.map((x) => [x.lote.id, x.lote.hectareas])).values()].reduce((a, b) => a + b, 0);
  const r = resumir(filas.map((x) => x.resultado), haFisicas);
  const porHa = (v: number | null) => (v === null || !r.hectareas ? null : v / r.hectareas);
  const costoDirecto = filas.reduce((a, x) => a + x.resultado.costoDirectoUsd, 0);
  const alquiler = filas.reduce((a, x) => a + x.resultado.alquilerUsd, 0);
  const resumen = [
    { etiqueta: 'Labores e insumos', porHa: m(porHa(costoDirecto)), total: m(costoDirecto) },
    { etiqueta: 'Alquiler', porHa: m(porHa(alquiler)), total: m(alquiler) },
    { etiqueta: 'Costo total', porHa: m(porHa(r.costoTotalUsd)), total: m(r.costoTotalUsd), destacado: true },
    { etiqueta: 'Ingreso', porHa: m(porHa(r.ingresoTotalUsd)), total: m(r.ingresoTotalUsd) },
    { etiqueta: 'Margen neto', porHa: m(r.margenNetoPorHaUsd), total: m(r.margenNetoUsd), destacado: true },
  ];

  // ---------- Resultado por cultivo
  const resultados: Tabla = {
    titulo: 'Resultado por cultivo',
    descripcion: `Importes en ${s}. "Proyectado": sin cosecha cargada, usa rinde y precio estimados.`,
    columnas: [
      { titulo: 'Lote', tipo: 'texto', ancho: 22 },
      { titulo: 'Cultivo', tipo: 'texto', ancho: 11 },
      { titulo: 'Ha', tipo: 'decimal', ancho: 7 },
      { titulo: 'Estado', tipo: 'texto', ancho: 11 },
      { titulo: `Rinde ${u}/ha`, tipo: 'decimal', ancho: 9 },
      { titulo: `Cubre costos ${u}/ha`, tipo: 'decimal', ancho: 10 },
      { titulo: 'Labores e insumos /ha', tipo: 'dinero', ancho: 11 },
      { titulo: 'Alquiler /ha', tipo: 'dinero', ancho: 10 },
      { titulo: 'Costo total /ha', tipo: 'dinero', ancho: 10 },
      { titulo: `Costo por ${u}`, tipo: 'dinero', ancho: 9 },
      { titulo: 'Costo total', tipo: 'dinero', ancho: 12 },
      { titulo: 'Ingreso', tipo: 'dinero', ancho: 12 },
      { titulo: 'Margen neto', tipo: 'dinero', ancho: 12 },
      { titulo: 'Margen neto /ha', tipo: 'dinero', ancho: 10 },
    ],
    filas: filas.map(({ cultivo, lote, campo, resultado: x }) => [
      `${lote.nombre}${campo ? ` (${campo.nombre})` : ''}`,
      nombreCultivo(cultivo),
      x.hectareas,
      x.esProyectado ? 'Proyectado' : 'Con cosecha',
      x.rindeKgHa === null ? null : x.rindeKgHa / f,
      x.rindeIndiferenciaKgHa === null ? null : x.rindeIndiferenciaKgHa / f,
      m(x.costoDirectoPorHaUsd),
      m(x.hectareas ? x.alquilerUsd / x.hectareas : null),
      m(x.costoTotalPorHaUsd),
      x.costoPorKgUsd === null ? null : m(x.costoPorKgUsd * f),
      m(x.costoTotalUsd),
      m(x.ingresoTotalUsd),
      m(x.margenNetoUsd),
      m(x.margenNetoPorHaUsd),
    ]),
    total: ['Total campaña', '', r.hectareasSembradas, '', null, null, null, null, null, null,
      m(r.costoTotalUsd), m(r.ingresoTotalUsd), m(r.margenNetoUsd), m(r.margenNetoPorHaUsd)],
  };

  // ---------- Alquileres
  const lotesConCultivo = [...new Map(filas.map((x) => [x.lote.id, x.lote])).values()];
  const filasAlquiler = lotesConCultivo.map((lote) => {
    const a = datos.alquileres.find((al) => al.loteId === lote.id);
    const total = a && a.modalidad !== 'porcentaje_cosecha' ? alquilerTotalLote(a, lote.hectareas) : null;
    const pagadoPorcentaje = a?.modalidad === 'porcentaje_cosecha'
      ? filas.filter((x) => x.lote.id === lote.id).reduce((acc, x) => acc + x.resultado.alquilerUsd, 0) : null;
    const totalFinal = total ?? pagadoPorcentaje;
    let detalle = 'Sin cargar';
    if (a) {
      detalle = a.modalidad === 'qq_soja_ha'
        ? `${a.valor} qq soja/ha (soja a US$ ${aUsd(a.precioSojaReferencia).toFixed(0)}/tn)`
        : a.modalidad === 'monto_ha'
          ? `${a.importePorHa?.moneda === 'ARS' ? '$' : 'US$'} ${a.importePorHa?.monto ?? 0} por ha`
          : `${a.valor}% de la cosecha`;
    }
    return [
      lugar(lote.id).texto,
      lote.hectareas,
      lote.tenencia === 'propio' ? 'Propio (referencia)' : 'Alquilado',
      a ? MODALIDADES_ALQUILER[a.modalidad] : '—',
      detalle,
      m(totalFinal === null ? null : totalFinal / lote.hectareas),
      m(totalFinal),
    ] as Celda[];
  });
  const totalAlquileres = filasAlquiler.reduce((acc, fl) => acc + ((fl[6] as number | null) ?? 0), 0);
  const alquileres: Tabla = {
    titulo: 'Alquileres por lote',
    descripcion: 'En lotes propios es un costo de oportunidad: lo que se cobraría alquilándolo.',
    columnas: [
      { titulo: 'Lote', tipo: 'texto', ancho: 24 },
      { titulo: 'Ha', tipo: 'decimal', ancho: 7 },
      { titulo: 'Tenencia', tipo: 'texto', ancho: 16 },
      { titulo: 'Modalidad', tipo: 'texto', ancho: 20 },
      { titulo: 'Condición', tipo: 'texto', ancho: 28 },
      { titulo: 'Por ha', tipo: 'dinero', ancho: 11 },
      { titulo: 'Total', tipo: 'dinero', ancho: 12 },
    ],
    filas: filasAlquiler,
    total: ['Total', haFisicas, '', '', '', haFisicas ? totalAlquileres / haFisicas : null, totalAlquileres],
  };

  // ---------- Labores e insumos (una fila por servicio y una por insumo)
  const cultivoPorId = new Map(datos.cultivos.map((c) => [c.id, c]));
  const filasLabores: Celda[][] = [];
  let totalLabores = 0;
  for (const l of [...datos.labores].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const c = cultivoPorId.get(l.cultivoEnLoteId);
    if (!c) continue;
    const donde = lugar(c.loteId).texto;
    if (l.costoPorHa && l.costoPorHa.monto) {
      const porHaL = imp(l.costoPorHa) ?? 0;
      totalLabores += porHaL * l.hectareas;
      filasLabores.push([fechaAR(l.fecha), donde, nombreCultivo(c), LABORES[l.tipo],
        l.modalidad === 'contratada' ? 'Servicio contratado' : 'Labor propia', l.hectareas, null, '', porHaL, porHaL, porHaL * l.hectareas]);
    }
    for (const a of datos.aplicados.filter((x) => x.laborId === l.id)) {
      const ins = datos.insumos.find((i) => i.id === a.insumoId);
      const precio = imp(a.precioUnitario) ?? 0;
      const porHaI = precio * a.dosisPorHa;
      totalLabores += porHaI * l.hectareas;
      filasLabores.push([fechaAR(l.fecha), donde, nombreCultivo(c), LABORES[l.tipo], ins?.nombre ?? 'Insumo',
        l.hectareas, a.dosisPorHa, ins ? `${UNIDADES_INSUMO[ins.unidad]}/ha` : '', precio, porHaI, porHaI * l.hectareas]);
    }
  }
  const labores: Tabla = {
    titulo: 'Labores e insumos',
    descripcion: 'Cada importe se convierte con el dólar del día en que se cargó.',
    columnas: [
      { titulo: 'Fecha', tipo: 'fecha', ancho: 10 },
      { titulo: 'Lote', tipo: 'texto', ancho: 22 },
      { titulo: 'Cultivo', tipo: 'texto', ancho: 10 },
      { titulo: 'Labor', tipo: 'texto', ancho: 12 },
      { titulo: 'Concepto', tipo: 'texto', ancho: 24 },
      { titulo: 'Ha', tipo: 'decimal', ancho: 7 },
      { titulo: 'Dosis', tipo: 'decimal', ancho: 7 },
      { titulo: 'Unidad', tipo: 'texto', ancho: 9 },
      { titulo: 'Precio unit.', tipo: 'dinero', ancho: 10 },
      { titulo: 'Costo /ha', tipo: 'dinero', ancho: 10 },
      { titulo: 'Costo total', tipo: 'dinero', ancho: 12 },
    ],
    filas: filasLabores,
    total: ['Total', '', '', '', '', null, null, '', null, null, totalLabores],
  };

  // ---------- Cosechas y ventas
  const filasMov: Celda[][] = [];
  for (const c of [...datos.cosechas].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const cl = cultivoPorId.get(c.cultivoEnLoteId);
    if (!cl) continue;
    filasMov.push([fechaAR(c.fecha), lugar(cl.loteId).texto, nombreCultivo(cl), 'Cosecha', c.kg / f, null, null, null, null, '']);
  }
  for (const v of [...datos.ventas].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const cl = cultivoPorId.get(v.cultivoEnLoteId);
    if (!cl) continue;
    const bruto = (v.kg / 1000) * (imp(v.precioPorTn) ?? 0);
    const gastos = (v.gastosComerciales ?? []).reduce((acc, g) => acc + (imp(g.importe) ?? 0), 0);
    filasMov.push([fechaAR(v.fecha), lugar(cl.loteId).texto, nombreCultivo(cl), 'Venta', v.kg / f,
      imp(v.precioPorTn), bruto, gastos, bruto - gastos, v.comprador ?? '']);
  }
  const movimientos: Tabla = {
    titulo: 'Cosechas y ventas',
    columnas: [
      { titulo: 'Fecha', tipo: 'fecha', ancho: 10 },
      { titulo: 'Lote', tipo: 'texto', ancho: 22 },
      { titulo: 'Cultivo', tipo: 'texto', ancho: 10 },
      { titulo: 'Movimiento', tipo: 'texto', ancho: 11 },
      { titulo: `Cantidad (${u})`, tipo: 'decimal', ancho: 11 },
      { titulo: 'Precio /tn', tipo: 'dinero', ancho: 10 },
      { titulo: 'Bruto', tipo: 'dinero', ancho: 12 },
      { titulo: 'Gastos comerciales', tipo: 'dinero', ancho: 12 },
      { titulo: 'Neto', tipo: 'dinero', ancho: 12 },
      { titulo: 'Comprador', tipo: 'texto', ancho: 18 },
    ],
    filas: filasMov,
  };

  const notas = [
    'Estimación orientativa. No reemplaza el asesoramiento de un contador.',
    'Todavía no incluye gastos de estructura (contador, seguros, vehículos).',
  ];
  if (op.moneda === 'ARS') notas.push(`Importes en pesos al dólar de $ ${op.tipoCambio.toLocaleString('es-AR')}. Cada gasto se registró en dólares con su dólar del día.`);
  if (filas.some((x) => x.resultado.esProyectado)) notas.push('Incluye cultivos proyectados (sin cosecha cargada).');
  if (r.cultivosSinPrecio > 0) notas.push('Hay cultivos sin precio cargado: el ingreso y el margen total están incompletos.');

  return {
    titulo: 'Informe de campaña',
    espacio: espacio.nombre,
    campania: campania.nombre,
    generado: fechaAR(op.hoy.toISOString().slice(0, 10)),
    moneda: op.moneda,
    simboloMoneda: s,
    tipoCambio: op.tipoCambio,
    unidad: u,
    resumen,
    hectareas: r.hectareas,
    hectareasSembradas: r.hectareasSembradas,
    notas,
    tablas: [resultados, alquileres, labores, movimientos],
  };
}

export const nombreArchivoInforme = (inf: Informe, ext: string) =>
  `AgroDecide - ${inf.espacio} - Campaña ${inf.campania.replace('/', '-')}.${ext}`.replace(/[\\/:*?"<>|]/g, '');
