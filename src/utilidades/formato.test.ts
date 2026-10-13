import { describe, expect, it } from 'vitest';
import { campaniaSugerida, grano, leerNumero, rinde } from './formato';

describe('formato', () => {
  it('lee números con coma o punto decimal', () => {
    expect(leerNumero('12,5')).toBe(12.5);
    expect(leerNumero('1.234,56')).toBe(1234.56);
    expect(leerNumero('1234.56')).toBe(1234.56);
    expect(Number.isNaN(leerNumero(''))).toBe(true);
  });
  it('convierte kg a qq y tn', () => {
    expect(grano(350000, 'qq')).toBe('3.500 qq');
    expect(grano(350000, 'tn')).toBe('350,0 tn');
    expect(rinde(3500, 'qq')).toBe('35,0 qq/ha');
  });
  it('sugiere la campaña de julio a junio', () => {
    expect(campaniaSugerida(new Date(2026, 9, 13)).nombre).toBe('2026/27');
    expect(campaniaSugerida(new Date(2027, 2, 1)).nombre).toBe('2026/27');
  });
});
