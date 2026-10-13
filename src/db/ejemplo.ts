// Campo de ejemplo con valores ILUSTRATIVOS, para conocer la app sin cargar nada.
import { db, nuevoId } from './baseDatos';
import type { Importe, InsumoAplicado, Labor, TipoLabor } from '../modelo/tipos';

const TC = 1400;
const usd = (monto: number): Importe => ({ monto, moneda: 'USD', tipoCambio: TC });
const ars = (monto: number): Importe => ({ monto, moneda: 'ARS', tipoCambio: TC });

/** Crea el espacio de ejemplo y devuelve su id y el de la campaña con resultados reales. */
export async function cargarEjemplo(): Promise<{ espacioId: string; campaniaId: string }> {
  const E = nuevoId();
  const k25 = nuevoId();
  const k26 = nuevoId();
  const campo = nuevoId();
  const [l1, l2, l3] = [nuevoId(), nuevoId(), nuevoId()];

  const ins: Record<string, { id: string; nombre: string; categoria: 'semilla' | 'fertilizante' | 'herbicida' | 'insecticida' | 'fungicida'; unidad: 'kg' | 'l' | 'bolsa'; precio: number }> = {
    glifo: { id: nuevoId(), nombre: 'Glifosato 66%', categoria: 'herbicida', unidad: 'l', precio: 3.8 },
    d24: { id: nuevoId(), nombre: '2,4-D', categoria: 'herbicida', unidad: 'l', precio: 5.5 },
    atra: { id: nuevoId(), nombre: 'Atrazina 90%', categoria: 'herbicida', unidad: 'kg', precio: 7 },
    post: { id: nuevoId(), nombre: 'Herbicida post-emergente', categoria: 'herbicida', unidad: 'l', precio: 12 },
    insec: { id: nuevoId(), nombre: 'Insecticida', categoria: 'insecticida', unidad: 'l', precio: 18 },
    fungi: { id: nuevoId(), nombre: 'Fungicida', categoria: 'fungicida', unidad: 'l', precio: 28 },
    sSoja: { id: nuevoId(), nombre: 'Semilla de soja', categoria: 'semilla', unidad: 'kg', precio: 0.65 },
    sMaiz: { id: nuevoId(), nombre: 'Semilla de maíz (bolsa 80 mil)', categoria: 'semilla', unidad: 'bolsa', precio: 220 },
    sTrigo: { id: nuevoId(), nombre: 'Semilla de trigo', categoria: 'semilla', unidad: 'kg', precio: 0.45 },
    map: { id: nuevoId(), nombre: 'Fosfato monoamónico (MAP)', categoria: 'fertilizante', unidad: 'kg', precio: 0.8 },
    urea: { id: nuevoId(), nombre: 'Urea', categoria: 'fertilizante', unidad: 'kg', precio: 0.65 },
  };

  const labores: Labor[] = [];
  const aplicados: InsumoAplicado[] = [];
  const labor = (cultivo: string, tipo: TipoLabor, fecha: string, ha: number, costo: Importe, insumos: [keyof typeof ins, number][] = []) => {
    const id = nuevoId();
    labores.push({ id, espacioId: E, cultivoEnLoteId: cultivo, tipo, fecha, hectareas: ha, modalidad: 'contratada', costoPorHa: costo });
    for (const [clave, dosis] of insumos) {
      aplicados.push({ id: nuevoId(), espacioId: E, laborId: id, insumoId: ins[clave].id, dosisPorHa: dosis, precioUnitario: usd(ins[clave].precio) });
    }
  };

  const soja1 = nuevoId(), maiz = nuevoId(), trigo = nuevoId(), soja2 = nuevoId(), trigo26 = nuevoId();

  // Lote 1 — soja de 1ra, campo propio
  labor(soja1, 'pulverizacion', '2025-09-20', 80, usd(15), [['glifo', 2.5], ['d24', 0.8]]);
  labor(soja1, 'siembra', '2025-11-05', 80, usd(55), [['sSoja', 75], ['map', 60]]);
  labor(soja1, 'pulverizacion', '2026-01-15', 80, usd(12), [['insec', 0.25], ['fungi', 0.5]]);
  labor(soja1, 'cosecha', '2026-04-10', 80, usd(75));
  // Lote 2 — maíz, alquilado
  labor(maiz, 'pulverizacion', '2025-08-25', 120, usd(15), [['glifo', 2.5], ['atra', 1.5]]);
  labor(maiz, 'siembra', '2025-09-28', 120, usd(60), [['sMaiz', 1], ['map', 100]]);
  labor(maiz, 'fertilizacion', '2025-11-10', 120, ars(14000), [['urea', 150]]);
  labor(maiz, 'pulverizacion', '2025-11-25', 120, usd(12), [['post', 1]]);
  labor(maiz, 'cosecha', '2026-03-20', 120, usd(90));
  // Lote 3 — trigo + soja de 2da, alquilado
  labor(trigo, 'siembra', '2025-06-10', 60, usd(50), [['sTrigo', 120], ['map', 80]]);
  labor(trigo, 'fertilizacion', '2025-08-01', 60, usd(10), [['urea', 120]]);
  labor(trigo, 'pulverizacion', '2025-09-20', 60, usd(12), [['fungi', 0.5]]);
  labor(trigo, 'cosecha', '2025-12-05', 60, usd(65));
  labor(soja2, 'siembra', '2025-12-08', 60, usd(50), [['sSoja', 80]]);
  labor(soja2, 'pulverizacion', '2026-01-10', 60, usd(12), [['glifo', 2]]);
  labor(soja2, 'cosecha', '2026-05-05', 60, usd(65));
  // Campaña actual — trigo en curso (proyectado)
  labor(trigo26, 'siembra', '2026-06-08', 60, usd(52), [['sTrigo', 120], ['map', 80]]);
  labor(trigo26, 'fertilizacion', '2026-08-05', 60, usd(10), [['urea', 130]]);

  await db.transaction('rw', db.tables, async () => {
    await db.espacios.add({
      id: E, nombre: 'Ejemplo — La Esperanza', esPropio: true, provincia: 'Santa Fe',
      condicionFiscal: 'responsable_inscripto', monedaReporte: 'USD', unidadGrano: 'qq', creadoEn: new Date().toISOString().slice(0, 10),
    });
    await db.campanias.bulkAdd([
      { id: k25, espacioId: E, nombre: '2025/26', fechaInicio: '2025-07-01', fechaFin: '2026-06-30' },
      { id: k26, espacioId: E, nombre: '2026/27', fechaInicio: '2026-07-01', fechaFin: '2027-06-30' },
    ]);
    await db.campos.add({ id: campo, espacioId: E, nombre: 'La Esperanza', localidad: 'Casilda', provincia: 'Santa Fe' });
    await db.lotes.bulkAdd([
      { id: l1, espacioId: E, campoId: campo, nombre: 'Lote 1 - La loma', hectareas: 80, tenencia: 'propio' },
      { id: l2, espacioId: E, campoId: campo, nombre: 'Lote 2 - El bajo', hectareas: 120, tenencia: 'alquilado' },
      { id: l3, espacioId: E, campoId: campo, nombre: 'Lote 3 - Fondo', hectareas: 60, tenencia: 'alquilado' },
    ]);
    await db.alquileres.bulkAdd([
      { id: nuevoId(), espacioId: E, loteId: l1, campaniaId: k25, tipo: 'referencia', modalidad: 'qq_soja_ha', valor: 14, precioSojaReferencia: usd(290) },
      { id: nuevoId(), espacioId: E, loteId: l2, campaniaId: k25, tipo: 'contrato', modalidad: 'qq_soja_ha', valor: 13, precioSojaReferencia: usd(290), notas: 'Pago en dos cuotas' },
      { id: nuevoId(), espacioId: E, loteId: l3, campaniaId: k25, tipo: 'contrato', modalidad: 'monto_ha', valor: 250, importePorHa: usd(250) },
      { id: nuevoId(), espacioId: E, loteId: l3, campaniaId: k26, tipo: 'contrato', modalidad: 'monto_ha', valor: 260, importePorHa: usd(260) },
    ]);
    await db.cultivos.bulkAdd([
      { id: soja1, espacioId: E, loteId: l1, campaniaId: k25, cultivo: 'soja', ciclo: 'primera', hectareas: 80, porcentajeAlquiler: 100, fechaSiembra: '2025-11-05', rindeEstimadoKgHa: 3500, precioEstimado: usd(295) },
      { id: maiz, espacioId: E, loteId: l2, campaniaId: k25, cultivo: 'maiz', ciclo: 'primera', hectareas: 120, porcentajeAlquiler: 100, fechaSiembra: '2025-09-28', rindeEstimadoKgHa: 8500, precioEstimado: usd(180) },
      { id: trigo, espacioId: E, loteId: l3, campaniaId: k25, cultivo: 'trigo', ciclo: 'primera', hectareas: 60, porcentajeAlquiler: 50, fechaSiembra: '2025-06-10', rindeEstimadoKgHa: 3500, precioEstimado: usd(205) },
      { id: soja2, espacioId: E, loteId: l3, campaniaId: k25, cultivo: 'soja', ciclo: 'segunda', hectareas: 60, porcentajeAlquiler: 50, fechaSiembra: '2025-12-08', rindeEstimadoKgHa: 2500, precioEstimado: usd(295) },
      { id: trigo26, espacioId: E, loteId: l3, campaniaId: k26, cultivo: 'trigo', ciclo: 'primera', hectareas: 60, porcentajeAlquiler: 100, fechaSiembra: '2026-06-08', rindeEstimadoKgHa: 3500, precioEstimado: usd(210) },
    ]);
    await db.insumos.bulkAdd(Object.values(ins).map((i) => ({
      id: i.id, espacioId: E, nombre: i.nombre, categoria: i.categoria, unidad: i.unidad, precioReferencia: usd(i.precio),
    })));
    await db.labores.bulkAdd(labores);
    await db.insumosAplicados.bulkAdd(aplicados);
    await db.cosechas.bulkAdd([
      { id: nuevoId(), espacioId: E, cultivoEnLoteId: soja1, fecha: '2026-04-10', kg: 304000 },
      { id: nuevoId(), espacioId: E, cultivoEnLoteId: maiz, fecha: '2026-03-20', kg: 1080000 },
      { id: nuevoId(), espacioId: E, cultivoEnLoteId: trigo, fecha: '2025-12-05', kg: 216000 },
      { id: nuevoId(), espacioId: E, cultivoEnLoteId: soja2, fecha: '2026-05-05', kg: 144000 },
    ]);
    await db.ventas.bulkAdd([
      { id: nuevoId(), espacioId: E, cultivoEnLoteId: soja1, fecha: '2026-04-28', kg: 200000, precioPorTn: usd(300), comprador: 'Acopio local',
        gastosComerciales: [{ concepto: 'Flete', importe: ars(4200000) }, { concepto: 'Comisión', importe: usd(600) }] },
      { id: nuevoId(), espacioId: E, cultivoEnLoteId: maiz, fecha: '2026-04-15', kg: 700000, precioPorTn: usd(185), comprador: 'Cooperativa',
        gastosComerciales: [{ concepto: 'Flete', importe: usd(12600) }, { concepto: 'Secada', importe: usd(3000) }, { concepto: 'Comisión', importe: usd(1300) }] },
      { id: nuevoId(), espacioId: E, cultivoEnLoteId: trigo, fecha: '2025-12-20', kg: 216000, precioPorTn: usd(205), comprador: 'Exportador',
        gastosComerciales: [{ concepto: 'Flete', importe: usd(2400) }] },
    ]);
  });
  return { espacioId: E, campaniaId: k25 };
}
