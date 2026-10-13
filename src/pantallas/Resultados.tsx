import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { db } from '../db/baseDatos';
import { useResultadosCampania } from '../db/consultas';
import { resumir } from '../calculos/margen';
import { useEspacio } from '../estado';
import { CULTIVOS } from '../modelo/etiquetas';
import { Boton, Dato, Opciones, Pantalla, Tarjeta, TituloSeccion, Vacio } from '../componentes/ui';
import { BarraRinde, EtiquetaEstado, MargenGrande, ResumenNumeros } from '../componentes/Resultado';
import { dinero, numero } from '../utilidades/formato';

export default function Resultados() {
  const { espacio, campania, tipoCambio } = useEspacio();
  const filas = useResultadosCampania(espacio.id, campania?.id);
  const moneda = espacio.monedaReporte;
  const u = espacio.unidadGrano;

  const ordenadas = useMemo(
    () => [...(filas ?? [])].sort((a, b) => (b.resultado.margenNetoPorHaUsd ?? -Infinity) - (a.resultado.margenNetoPorHaUsd ?? -Infinity)),
    [filas],
  );
  const resumen = useMemo(() => resumir(ordenadas.map((f) => f.resultado)), [ordenadas]);
  const hayProyectados = ordenadas.some((f) => f.resultado.esProyectado);

  if (!campania) {
    return (
      <Pantalla titulo="Resultados">
        <Vacio titulo="No hay campañas" texto="Creá una campaña en Ajustes para empezar a cargar." accion={<Link to="/ajustes"><Boton>Ir a Ajustes</Boton></Link>} />
      </Pantalla>
    );
  }

  return (
    <Pantalla titulo="Resultados" subtitulo={`Campaña ${campania.nombre}`}>
      <div className="grid grid-cols-2 gap-2">
        <Opciones valor={moneda} onCambio={(m) => db.espacios.update(espacio.id, { monedaReporte: m })}
          opciones={[{ valor: 'USD', texto: 'US$' }, { valor: 'ARS', texto: 'Pesos' }]} />
        <Opciones valor={u} onCambio={(v) => db.espacios.update(espacio.id, { unidadGrano: v })}
          opciones={[{ valor: 'qq', texto: 'qq' }, { valor: 'tn', texto: 'tn' }]} />
      </div>
      {moneda === 'ARS' && (
        <p className="-mt-2 text-xs text-stone-500">
          Los importes se calculan en dólares (cada uno con su dólar del día) y se muestran en pesos al dólar de ${numero(tipoCambio)}.
          Lo cambiás en Ajustes.
        </p>
      )}

      {ordenadas.length === 0 ? (
        <Vacio
          titulo="Todavía no hay cultivos en esta campaña"
          texto="Cargá un lote y lo que sembraste. Con eso ya ves el costo por hectárea, y a medida que sumes labores, cosecha y ventas, el margen."
          accion={<Link to="/lotes"><Boton>Cargar lotes</Boton></Link>}
        />
      ) : (
        <>
          <div className="rounded-2xl bg-campo-800 p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-trigo">Total campaña</span>
              <span className="text-sm text-white/70">{numero(resumen.hectareas)} ha</span>
            </div>
            <div className="mt-2 text-xs text-white/70">Margen neto</div>
            <div className="num text-4xl font-extrabold tracking-tight">{dinero(resumen.margenNetoUsd, moneda, tipoCambio, 0)}</div>
            <div className="num text-sm text-white/80">{dinero(resumen.margenNetoPorHaUsd, moneda, tipoCambio, 0)} por ha</div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/15 pt-3 text-sm">
              <div><div className="text-white/60">Costo total</div><div className="num font-bold">{dinero(resumen.costoTotalUsd, moneda, tipoCambio, 0)}</div></div>
              <div><div className="text-white/60">Ingreso total</div><div className="num font-bold">{dinero(resumen.ingresoTotalUsd, moneda, tipoCambio, 0)}</div></div>
            </div>
            {(hayProyectados || resumen.cultivosSinPrecio > 0) && (
              <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/85">
                {resumen.cultivosSinPrecio > 0
                  ? `A ${resumen.cultivosSinPrecio === 1 ? 'un cultivo le falta' : `${resumen.cultivosSinPrecio} cultivos les falta`} el precio: el margen total no se puede calcular.`
                  : 'Incluye cultivos proyectados con rinde y precio estimados.'}
              </p>
            )}
          </div>

          <TituloSeccion>Por cultivo · de mayor a menor margen</TituloSeccion>
          {ordenadas.map(({ cultivo, lote, campo, resultado: r }) => (
            <Link key={cultivo.id} to={`/cultivos/${cultivo.id}`} className="block">
              <Tarjeta className="transition active:scale-[0.99]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-extrabold text-campo-900">
                      {cultivo.cultivo === 'otro' ? cultivo.nombreCultivo || 'Otro' : CULTIVOS[cultivo.cultivo]}
                      {cultivo.ciclo === 'segunda' && <span className="font-semibold text-stone-500"> de 2da</span>}
                    </div>
                    <div className="truncate text-sm text-stone-600">{lote.nombre}{campo ? ` · ${campo.nombre}` : ''} · {numero(r.hectareas)} ha</div>
                  </div>
                  <EtiquetaEstado r={r} />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <MargenGrande r={r} moneda={moneda} tc={tipoCambio} />
                </div>
                <div className="mt-2"><BarraRinde r={r} u={u} /></div>
                <div className="mt-2"><ResumenNumeros r={r} moneda={moneda} tc={tipoCambio} u={u} /></div>
                {r.avisos.length > 0 && <Dato etiqueta={<span className="text-trigo-700">⚠ Faltan datos</span>} valor={<span className="text-sm text-trigo-700">Ver detalle</span>} />}
              </Tarjeta>
            </Link>
          ))}
        </>
      )}
    </Pantalla>
  );
}
