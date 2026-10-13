// Botones para descargar el informe de la campaña en Excel o PDF.
import { useState } from 'react';
import { leerParaInforme } from '../db/consultas';
import { armarInforme, nombreArchivoInforme } from '../informes/modelo';
import { useEspacio } from '../estado';
import { entregarArchivo } from '../utilidades/descargas';
import { cx } from './ui';

type Formato = 'excel' | 'pdf';

export function BotonesInforme({ compacto }: { compacto?: boolean }) {
  const { espacio, campania, tipoCambio } = useEspacio();
  const [generando, setGenerando] = useState<Formato | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!campania) return null;

  const generar = async (formato: Formato) => {
    setGenerando(formato);
    setError(null);
    try {
      const datos = await leerParaInforme(espacio, campania);
      const informe = armarInforme(datos, { moneda: espacio.monedaReporte, tipoCambio, unidad: espacio.unidadGrano, hoy: new Date() });
      if (formato === 'excel') {
        const { generarExcel } = await import('../informes/excel');
        await entregarArchivo(nombreArchivoInforme(informe, 'xlsx'), await generarExcel(informe), 'Informe AgroDecide');
      } else {
        const { generarPdf } = await import('../informes/pdf');
        await entregarArchivo(nombreArchivoInforme(informe, 'pdf'), await generarPdf(informe), 'Informe AgroDecide');
      }
    } catch (e) {
      console.error(e);
      setError('No se pudo generar el informe. Probá de nuevo.');
    } finally {
      setGenerando(null);
    }
  };

  const boton = (formato: Formato, texto: string, icono: string, color: string) => (
    <button
      type="button"
      onClick={() => generar(formato)}
      disabled={generando !== null}
      className={cx('flex flex-1 items-center justify-center gap-2 rounded-xl bg-white font-semibold ring-1 ring-inset ring-stone-300 transition hover:bg-stone-50 disabled:opacity-50',
        compacto ? 'h-10 text-sm' : 'h-12')}
    >
      <span className={cx('grid h-6 w-6 place-items-center rounded-md text-[10px] font-black text-white', color)}>{icono}</span>
      {generando === formato ? 'Generando…' : texto}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {boton('excel', 'Informe Excel', 'XLS', 'bg-[#1d6f42]')}
        {boton('pdf', 'Informe PDF', 'PDF', 'bg-[#c0392b]')}
      </div>
      {error && <p className="text-sm text-tierra">{error}</p>}
    </div>
  );
}
