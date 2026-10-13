import type { Moneda, UnidadGrano } from '../modelo/tipos';
import { deUsd } from '../calculos/moneda';

const nf = (dec: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export function numero(n: number | null | undefined, dec = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return nf(dec).format(n);
}

/** Muestra un valor en USD en la moneda de reporte. */
export function dinero(usd: number | null | undefined, moneda: Moneda, tc: number, dec?: number): string {
  if (usd === null || usd === undefined || !Number.isFinite(usd)) return '—';
  const v = deUsd(usd, moneda, tc);
  const d = dec ?? (Math.abs(v) < 10 ? 2 : 0);
  return `${moneda === 'USD' ? 'US$' : '$'} ${nf(d).format(v)}`;
}

export const factorGrano = (u: UnidadGrano) => (u === 'qq' ? 100 : 1000);

/** kg → qq o tn. */
export function grano(kg: number | null | undefined, u: UnidadGrano, dec?: number): string {
  if (kg === null || kg === undefined || !Number.isFinite(kg)) return '—';
  const v = kg / factorGrano(u);
  return `${numero(v, dec ?? (u === 'qq' ? 0 : 1))} ${u}`;
}

/** kg/ha → qq/ha o tn/ha. */
export function rinde(kgHa: number | null | undefined, u: UnidadGrano): string {
  if (kgHa === null || kgHa === undefined || !Number.isFinite(kgHa)) return '—';
  return `${numero(kgHa / factorGrano(u), u === 'qq' ? 1 : 2)} ${u}/ha`;
}

export function fecha(iso: string | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export const hoy = () => {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

/** Lee un número de un input aceptando coma decimal. Devuelve NaN si está vacío. */
export function leerNumero(texto: string): number {
  const limpio = texto.trim().replace(/\s/g, '');
  if (limpio === '') return NaN;
  // "1.234,56" → 1234.56 ; "1234.56" → 1234.56 ; "12,5" → 12.5
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  return Number(normal);
}

/** Campaña sugerida según la fecha: de julio a junio. */
export function campaniaSugerida(d = new Date()) {
  const a = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return {
    nombre: `${a}/${String((a + 1) % 100).padStart(2, '0')}`,
    fechaInicio: `${a}-07-01`,
    fechaFin: `${a + 1}-06-30`,
  };
}
