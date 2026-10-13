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

export function ResumenNumeros({ r, moneda, tc, u, completo }: { r: ResultadoCultivo; moneda: Moneda; tc: number; u: UnidadGrano; completo?: boolean }) {
  const d = (v: number | null, dec?: number) => dinero(v, moneda, tc, dec);
  const tono = (v: number | null) => (v === null ? undefined : v >= 0 ? 'pos' : 'neg') as 'pos' | 'neg' | undefined;
  const porHa = (v: number | null) => (v === null || !r.hectareas ? null : v / r.hectareas);
  return (
    <div className="divide-y divide-stone-100">
      <div className="pb-1">
        <Dato etiqueta="Costo directo / ha" valor={d(r.costoDirectoPorHaUsd)} />
        {r.alquilerUsd > 0 && <Dato etiqueta={r.alquilerEsReferencia ? 'Alquiler de referencia / ha' : 'Alquiler / ha'} valor={d(porHa(r.alquilerUsd))} />}
        <Dato etiqueta="Costo total / ha" valor={d(r.costoTotalPorHaUsd)} fuerte />
        <Dato etiqueta={`Costo por ${u}`} valor={r.costoPorKgUsd === null ? '—' : d(r.costoPorKgUsd * factorGrano(u), 2)} />
      </div>
      {completo && (
        <div className="py-1">
          <Dato etiqueta={r.esProyectado ? 'Producción estimada' : 'Cosechado'} valor={grano(r.kgProduccion, u)} />
          <Dato etiqueta="Vendido" valor={grano(r.kgVendidos, u)} />
          {r.kgSinVender > 0 && <Dato etiqueta="Sin vender (valuado a precio de referencia)" valor={grano(r.kgSinVender, u)} />}
          <Dato etiqueta="Ventas netas de gastos" valor={d(r.ingresoNetoVentasUsd)} />
          {r.kgSinVender > 0 && <Dato etiqueta="Valor de lo no vendido" valor={d(r.valorSinVenderUsd)} />}
          <Dato etiqueta="Ingreso total" valor={d(r.ingresoTotalUsd)} fuerte />
          <Dato etiqueta="Costo directo total" valor={d(r.costoDirectoUsd)} />
          {r.alquilerUsd > 0 && <Dato etiqueta={r.alquilerEsReferencia ? 'Alquiler de referencia total' : 'Alquiler total'} valor={d(r.alquilerUsd)} />}
          <Dato etiqueta="Margen bruto" valor={d(r.margenBrutoUsd)} tono={tono(r.margenBrutoUsd)} />
        </div>
      )}
      <div className="pt-1">
        <Dato etiqueta="Margen neto" valor={d(r.margenNetoUsd)} fuerte tono={tono(r.margenNetoUsd)} />
        {r.margenNetoSinOportunidadUsd !== null && (
          <Dato etiqueta="Margen sin contar alquiler propio" valor={d(r.margenNetoSinOportunidadUsd)} tono={tono(r.margenNetoSinOportunidadUsd)} />
        )}
      </div>
    </div>
  );
}

/** Número grande del margen neto por hectárea. */
export function MargenGrande({ r, moneda, tc }: { r: ResultadoCultivo; moneda: Moneda; tc: number }) {
  const v = r.margenNetoPorHaUsd;
  return (
    <div>
      <div className="text-xs font-semibold text-stone-500">Margen neto por hectárea</div>
      <div className={cx('num text-3xl font-extrabold tracking-tight', v === null ? 'text-stone-400' : v >= 0 ? 'text-campo-700' : 'text-tierra')}>
        {dinero(v, moneda, tc, 0)}
      </div>
    </div>
  );
}
