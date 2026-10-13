// Presentación de los resultados económicos de un cultivo.
import type { Aviso, ResultadoCultivo } from '../calculos/margen';
import type { Moneda, UnidadGrano } from '../modelo/tipos';
import { dinero, factorGrano, grano, rinde } from '../utilidades/formato';
import { cx, Dato, Etiqueta } from './ui';

const TEXTO_AVISO: Record<Aviso, string> = {
  sin_precio: 'Falta un precio estimado o una venta: no se puede calcular el ingreso ni el margen.',
  sin_rinde: 'Falta el rinde estimado o la cosecha: no se puede calcular el costo por quintal.',
  vendido_mas_que_cosechado: 'Cargaste más kilos vendidos que cosechados. Revisá la cosecha.',
  alquiler_sin_precio_soja: 'El alquiler está en quintales de soja pero falta el precio de la soja.',
};

export function Avisos({ avisos }: { avisos: Aviso[] }) {
  if (!avisos.length) return null;
  return (
    <ul className="space-y-1.5">
      {avisos.map((a) => (
        <li key={a} className="flex gap-2 rounded-xl bg-trigo/20 px-3 py-2 text-sm text-stone-800">
          <span className="font-bold text-trigo-700">!</span>{TEXTO_AVISO[a]}
        </li>
      ))}
    </ul>
  );
}

export function EtiquetaEstado({ r }: { r: ResultadoCultivo }) {
  return r.esProyectado ? <Etiqueta tono="proyectado">Proyectado</Etiqueta> : <Etiqueta tono="real">Con cosecha</Etiqueta>;
}

/** Barra que compara el rinde obtenido/esperado con el rinde de indiferencia. */
export function BarraRinde({ r, u }: { r: ResultadoCultivo; u: UnidadGrano }) {
  if (r.rindeKgHa === null || r.rindeIndiferenciaKgHa === null || r.rindeKgHa <= 0) return null;
  const max = Math.max(r.rindeKgHa, r.rindeIndiferenciaKgHa) * 1.08;
  const cubre = r.rindeKgHa >= r.rindeIndiferenciaKgHa;
  return (
    <div className="pt-1">
      <div className="relative h-3 overflow-hidden rounded-full bg-stone-100">
        <div className={cx('absolute inset-y-0 left-0 rounded-full', cubre ? 'bg-campo-600' : 'bg-tierra')} style={{ width: `${(r.rindeKgHa / max) * 100}%` }} />
        <div className="absolute inset-y-[-2px] w-[3px] rounded bg-campo-900" style={{ left: `${(r.rindeIndiferenciaKgHa / max) * 100}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-stone-600">
        <span>Rinde: <b className="num text-stone-900">{rinde(r.rindeKgHa, u)}</b></span>
        <span>Cubre costos con: <b className="num text-stone-900">{rinde(r.rindeIndiferenciaKgHa, u)}</b></span>
      </div>
    </div>
  );
}

const tonoDe = (v: number | null) => (v === null ? '' : v >= 0 ? 'text-campo-700' : 'text-tierra');

/**
 * Cuadro económico con dos columnas bien separadas: "Por hectárea" y "Total".
 * Cada fila es el mismo concepto visto de las dos formas.
 */
export function ResumenNumeros({ r, moneda, tc, u, completo }: { r: ResultadoCultivo; moneda: Moneda; tc: number; u: UnidadGrano; completo?: boolean }) {
  const d = (v: number | null, dec?: number) => dinero(v, moneda, tc, dec);
  const porHa = (v: number | null) => (v === null || !r.hectareas ? null : v / r.hectareas);
  type Fila = { concepto: string; total: number | null; fuerte?: boolean; signo?: boolean; separador?: boolean };
  const filas: Fila[] = [
    { concepto: 'Labores e insumos', total: r.costoDirectoUsd },
    ...(r.alquilerUsd > 0 ? [{ concepto: r.alquilerEsReferencia ? 'Alquiler (referencia)' : 'Alquiler', total: r.alquilerUsd }] : []),
    { concepto: 'Costo total', total: r.costoTotalUsd, fuerte: true },
    { concepto: 'Ingreso', total: r.ingresoTotalUsd, separador: true },
    ...(completo ? [{ concepto: 'Margen bruto', total: r.margenBrutoUsd, signo: true }] : []),
    { concepto: 'Margen neto', total: r.margenNetoUsd, fuerte: true, signo: true },
    ...(r.margenNetoSinOportunidadUsd !== null ? [{ concepto: 'Margen sin alquiler propio', total: r.margenNetoSinOportunidadUsd, signo: true }] : []),
  ];
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-stone-200">
        <table className="w-full text-[13px] sm:text-sm">
          <thead>
            <tr className="bg-campo-800 text-white">
              <th className="px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Concepto</th>
              <th className="px-2.5 py-2 text-right text-[11px] font-bold uppercase tracking-wider">Por ha</th>
              <th className="border-l border-white/20 px-2.5 py-2 text-right text-[11px] font-bold uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.concepto} className={cx(f.separador && 'border-t-2 border-stone-300', !f.separador && 'border-t border-stone-100', f.fuerte && 'bg-campo-50')}>
                <td className={cx('px-2.5 py-2 leading-tight', f.fuerte ? 'font-bold text-campo-900' : 'text-stone-700')}>{f.concepto}</td>
                <td className={cx('num whitespace-nowrap px-2.5 py-2 text-right', f.fuerte && 'font-bold', f.signo && tonoDe(f.total))}>{d(porHa(f.total))}</td>
                <td className={cx('num whitespace-nowrap border-l border-stone-200 px-2.5 py-2 text-right', f.fuerte && 'font-bold', f.signo && tonoDe(f.total))}>{d(f.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dato etiqueta={`Costo por ${u} producido`} valor={r.costoPorKgUsd === null ? '—' : d(r.costoPorKgUsd * factorGrano(u), 2)} />
      {completo && (
        <div className="rounded-xl bg-stone-50 px-3 py-1">
          <div className="pt-2 text-[11px] font-bold uppercase tracking-wider text-campo-700">Producción y ventas</div>
          <Dato etiqueta={r.esProyectado ? 'Producción estimada' : 'Cosechado'} valor={grano(r.kgProduccion, u)} />
          <Dato etiqueta="Vendido" valor={grano(r.kgVendidos, u)} />
          {r.kgSinVender > 0 && <Dato etiqueta="Sin vender (a precio de referencia)" valor={grano(r.kgSinVender, u)} />}
          <Dato etiqueta="Ventas, netas de gastos" valor={d(r.ingresoNetoVentasUsd)} />
          {r.kgSinVender > 0 && <Dato etiqueta="Valor de lo no vendido" valor={d(r.valorSinVenderUsd)} />}
        </div>
      )}
    </div>
  );
}


/** Margen neto destacado, por hectárea y total, cada uno en su caja. */
export function MargenGrande({ r, moneda, tc }: { r: ResultadoCultivo; moneda: Moneda; tc: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-campo-50 px-3 py-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Margen por ha</div>
        <div className={cx('num whitespace-nowrap text-xl font-extrabold tracking-tight sm:text-2xl', tonoDe(r.margenNetoPorHaUsd) || 'text-stone-400')}>{dinero(r.margenNetoPorHaUsd, moneda, tc, 0)}</div>
      </div>
      <div className="rounded-xl border border-stone-200 px-3 py-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Margen total</div>
        <div className={cx('num whitespace-nowrap text-xl font-extrabold tracking-tight sm:text-2xl', tonoDe(r.margenNetoUsd) || 'text-stone-400')}>{dinero(r.margenNetoUsd, moneda, tc, 0)}</div>
      </div>
    </div>
  );
}
