import type { Importe, Moneda } from '../modelo/tipos';

/** Convierte un importe a USD usando el tipo de cambio de su propia fecha. */
export function aUsd(importe: Importe | undefined | null): number {
  if (!importe || !Number.isFinite(importe.monto)) return 0;
  if (importe.moneda === 'USD') return importe.monto;
  if (!importe.tipoCambio || importe.tipoCambio <= 0) return 0;
  return importe.monto / importe.tipoCambio;
}

/** Pasa un valor en USD a la moneda de reporte. Para ARS usa el tipo de cambio actual. */
export function deUsd(usd: number, moneda: Moneda, tipoCambioActual: number): number {
  return moneda === 'USD' ? usd : usd * tipoCambioActual;
}

/** Divide sin romper: si el divisor es 0 devuelve null. */
export function dividir(a: number, b: number): number | null {
  return b === 0 || !Number.isFinite(b) ? null : a / b;
}
