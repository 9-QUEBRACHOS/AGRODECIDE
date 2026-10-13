import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db, nuevoId } from '../db/baseDatos';
import { borrarCultivo, borrarLabor } from '../db/operaciones';
import { useResultadosCampania } from '../db/consultas';
import { useEspacio } from '../estado';
import { CATEGORIAS_INSUMO, LABORES, UNIDADES_INSUMO } from '../modelo/etiquetas';
import type { CategoriaInsumo, Cosecha, Insumo, InsumoAplicado, Labor, TipoLabor, UnidadGrano, UnidadInsumo, Venta } from '../modelo/tipos';
import { aUsd } from '../calculos/moneda';
import {
  BotonAgregar, Boton, Campo, cx, Entrada, EntradaImporte, EntradaNumero, formDeImporte, Formulario, Hoja,
  importeDeForm, importeVacio, Opciones, Pantalla, Selector, Tarjeta, TituloSeccion, type ImporteForm,
} from '../componentes/ui';
import { Avisos, BarraRinde, EtiquetaEstado, MargenGrande, ResumenNumeros } from '../componentes/Resultado';
import { dinero, factorGrano, fecha, grano, hoy, leerNumero, numero, rinde } from '../utilidades/formato';
import { FormCultivo, nombreCultivo } from './LoteDetalle';

type Panel =
  | { tipo: 'editar' }
  | { tipo: 'labor'; labor?: Labor }
  | { tipo: 'cosecha'; cosecha?: Cosecha }
  | { tipo: 'venta'; venta?: Venta };

export default function CultivoDetalle() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const { espacio, tipoCambio } = useEspacio();
  const cultivo = useLiveQuery(() => db.cultivos.get(id), [id]);
  const lote = useLiveQuery(() => (cultivo ? db.lotes.get(cultivo.loteId) : undefined), [cultivo?.loteId]);
  const hermanos = useLiveQuery(
    () => (cultivo ? db.cultivos.where('loteId').equals(cultivo.loteId).filter((c) => c.campaniaId === cultivo.campaniaId).toArray() : []),
    [cultivo?.loteId, cultivo?.campaniaId]);
  const labores = useLiveQuery(async () => (await db.labores.where('cultivoEnLoteId').equals(id).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha)), [id]);
  const aplicados = useLiveQuery(async () => {
    const ids = (await db.labores.where('cultivoEnLoteId').equals(id).primaryKeys());
    return db.insumosAplicados.where('laborId').anyOf(ids).toArray();
  }, [id]);
  const insumos = useLiveQuery(() => db.insumos.where('espacioId').equals(espacio.id).sortBy('nombre'), [espacio.id]);
  const cosechas = useLiveQuery(async () => (await db.cosechas.where('cultivoEnLoteId').equals(id).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha)), [id]);
  const ventas = useLiveQuery(async () => (await db.ventas.where('cultivoEnLoteId').equals(id).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha)), [id]);
  const filas = useResultadosCampania(espacio.id, cultivo?.campaniaId);
  const alquiler = useLiveQuery(
    () => (cultivo ? db.alquileres.where({ loteId: cultivo.loteId, campaniaId: cultivo.campaniaId }).first() : undefined),
    [cultivo?.loteId, cultivo?.campaniaId]);
  const resultado = filas?.find((f) => f.cultivo.id === id)?.resultado;

  const [panel, setPanel] = useState<Panel | null>(null);
  const cerrar = () => setPanel(null);
  const moneda = espacio.monedaReporte;
  const u = espacio.unidadGrano;
  const d = (usd: number | null, dec?: number) => dinero(usd, moneda, tipoCambio, dec);

  if (cultivo === undefined) return null;
  if (!cultivo || !lote) return <Pantalla titulo="Cultivo no encontrado" volver="/lotes"><p>Este cultivo ya no existe.</p></Pantalla>;

  const nombreInsumo = (iid: string) => insumos?.find((i) => i.id === iid);

  return (
    <Pantalla
      titulo={`${nombreCultivo(cultivo)}${cultivo.ciclo === 'segunda' ? ' de 2da' : ''}`}
      subtitulo={`${lote.nombre} · ${numero(cultivo.hectareas)} ha${cultivo.fechaSiembra ? ` · sembrado ${fecha(cultivo.fechaSiembra)}` : ''}`}
      volver={`/lotes/${lote.id}`}
      acciones={<Boton chico variante="fantasma" onClick={() => setPanel({ tipo: 'editar' })}>Editar</Boton>}
    >
      {resultado && (
        <Tarjeta>
          <div className="flex items-start justify-between gap-2">
            <MargenGrande r={resultado} moneda={moneda} tc={tipoCambio} />
            <EtiquetaEstado r={resultado} />
          </div>
          <div className="mt-2"><BarraRinde r={resultado} u={u} /></div>
          <div className="mt-3"><Avisos avisos={resultado.avisos} /></div>
          <div className="mt-2"><ResumenNumeros r={resultado} moneda={moneda} tc={tipoCambio} u={u} completo /></div>
          {resultado.esProyectado && (
            <p className="mt-2 text-xs text-stone-500">
              Proyectado con rinde estimado de {rinde(cultivo.rindeEstimadoKgHa, u)}
              {cultivo.precioEstimado ? ` y precio de US$ ${numero(aUsd(cultivo.precioEstimado))}/tn` : ''}. Cuando cargues la cosecha pasa a ser real.
            </p>
          )}
        </Tarjeta>
      )}

      {/* ---------- Alquiler (siempre visible) ---------- */}
      <Link to={`/lotes/${lote.id}`} className={cx('flex items-center gap-3 rounded-2xl px-4 py-3',
        alquiler || lote.tenencia === 'propio' ? 'bg-white ring-1 ring-stone-200' : 'bg-trigo/15 ring-2 ring-trigo')}>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-campo-700">
            {lote.tenencia === 'propio' ? 'Alquiler de referencia' : 'Alquiler del lote'}
          </div>
          <div className="text-sm text-stone-800">
            {!alquiler
              ? (lote.tenencia === 'propio' ? 'Sin cargar (opcional en campo propio)' : 'Falta cargarlo: el margen no es real')
              : alquiler.modalidad === 'porcentaje_cosecha'
                ? `${numero(alquiler.valor, 1)}% de la cosecha · ${d(resultado ? resultado.alquilerUsd / (cultivo.hectareas || 1) : null)}/ha`
                : `${d(resultado ? resultado.alquilerUsd / (cultivo.hectareas || 1) : null)}/ha para este cultivo${(hermanos?.length ?? 0) > 1 ? ` (${numero(cultivo.porcentajeAlquiler)}% del lote)` : ''}`}
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-campo-700">{alquiler ? 'Ver' : 'Cargar'} ›</span>
      </Link>

      {/* ---------- Labores ---------- */}
      <TituloSeccion accion={<BotonAgregar onClick={() => setPanel({ tipo: 'labor' })}>Labor</BotonAgregar>}>
        Labores e insumos · {d(resultado?.costoDirectoPorHaUsd ?? null)}/ha
      </TituloSeccion>
      {(labores ?? []).length === 0 ? (
        <Tarjeta className="text-sm text-stone-600">
          Cargá cada trabajo (siembra, pulverización, fertilización, cosecha…) con lo que pagaste por hectárea y los insumos que usaste.
        </Tarjeta>
      ) : (
        <Tarjeta className="divide-y divide-stone-100 py-1">
          {labores!.map((l) => {
            const ins = (aplicados ?? []).filter((a) => a.laborId === l.id);
            const costoHa = aUsd(l.costoPorHa) + ins.reduce((s, a) => s + a.dosisPorHa * aUsd(a.precioUnitario), 0);
            return (
              <button key={l.id} className="block w-full py-3 text-left" onClick={() => setPanel({ tipo: 'labor', labor: l })}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-campo-900">{LABORES[l.tipo]}<span className="font-normal text-stone-500"> · {fecha(l.fecha)}</span></span>
                  <span className="num font-bold">{d(costoHa)}/ha</span>
                </div>
                <div className="mt-0.5 text-sm text-stone-600">
                  {l.modalidad === 'contratada' ? 'Contratada' : 'Propia'}
                  {l.costoPorHa ? ` · labor ${d(aUsd(l.costoPorHa))}/ha` : ''}
                  {l.hectareas !== cultivo.hectareas ? ` · ${numero(l.hectareas)} ha` : ''}
                </div>
                {ins.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-sm text-stone-600">
                    {ins.map((a) => {
                      const i = nombreInsumo(a.insumoId);
                      return <li key={a.id}>· {i?.nombre ?? 'Insumo borrado'} — {numero(a.dosisPorHa, 2)} {i ? UNIDADES_INSUMO[i.unidad] : ''}/ha</li>;
                    })}
                  </ul>
                )}
                {l.notas && <div className="mt-1 text-xs italic text-stone-500">{l.notas}</div>}
              </button>
            );
          })}
        </Tarjeta>
      )}

      {/* ---------- Cosecha ---------- */}
      <TituloSeccion accion={<BotonAgregar onClick={() => setPanel({ tipo: 'cosecha' })}>Cosecha</BotonAgregar>}>
        Cosecha{resultado && !resultado.esProyectado ? ` · ${rinde(resultado.rindeKgHa, u)}` : ''}
      </TituloSeccion>
      {(cosechas ?? []).length === 0 ? (
        <Tarjeta className="text-sm text-stone-600">Cuando coseches, cargá los kilos (podés cargar por partes). Hasta entonces el resultado es proyectado.</Tarjeta>
      ) : (
        <Tarjeta className="divide-y divide-stone-100 py-1">
          {cosechas!.map((c) => (
            <button key={c.id} className="flex w-full items-baseline justify-between py-3 text-left" onClick={() => setPanel({ tipo: 'cosecha', cosecha: c })}>
              <span className="text-stone-700">{fecha(c.fecha)}</span>
              <span className="num font-bold">{grano(c.kg, u)}</span>
            </button>
          ))}
        </Tarjeta>
      )}

      {/* ---------- Ventas ---------- */}
      <TituloSeccion accion={<BotonAgregar onClick={() => setPanel({ tipo: 'venta' })}>Venta</BotonAgregar>}>
        Ventas{resultado && resultado.kgVendidos > 0 ? ` · ${grano(resultado.kgVendidos, u)}` : ''}
      </TituloSeccion>
      {(ventas ?? []).length === 0 ? (
        <Tarjeta className="text-sm text-stone-600">Cargá cada venta con su precio y los gastos (flete, comisión, secada). Lo que no vendas se valúa al precio estimado.</Tarjeta>
      ) : (
        <Tarjeta className="divide-y divide-stone-100 py-1">
          {ventas!.map((v) => {
            const bruto = (v.kg * aUsd(v.precioPorTn)) / 1000;
            const gastos = v.gastosComerciales.reduce((s, g) => s + aUsd(g.importe), 0);
            return (
              <button key={v.id} className="block w-full py-3 text-left" onClick={() => setPanel({ tipo: 'venta', venta: v })}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-campo-900">{grano(v.kg, u)}<span className="font-normal text-stone-500"> · {fecha(v.fecha)}</span></span>
                  <span className="num font-bold">{d(bruto - gastos)}</span>
                </div>
                <div className="text-sm text-stone-600">
                  {v.precioPorTn.moneda === 'ARS' ? '$' : 'US$'} {numero(v.precioPorTn.monto)}/tn{v.comprador ? ` · ${v.comprador}` : ''}
                  {gastos > 0 ? ` · gastos ${d(gastos)}` : ''}
                </div>
              </button>
            );
          })}
        </Tarjeta>
      )}

      {/* ---------- Paneles ---------- */}
      <Hoja titulo="Editar cultivo" abierta={panel?.tipo === 'editar'} onCerrar={cerrar}>
        <FormCultivo lote={lote} campaniaId={cultivo.campaniaId} cultivo={cultivo} otros={hermanos ?? []} unidad={u} tipoCambio={tipoCambio}
          onListo={cerrar}
          onBorrar={async () => {
            if (confirm('¿Borrar este cultivo con sus labores, cosechas y ventas? No se puede deshacer.')) {
              await borrarCultivo(cultivo.id); navegar(`/lotes/${lote.id}`, { replace: true });
            }
          }} />
      </Hoja>
      <Hoja titulo={panel?.tipo === 'labor' && panel.labor ? 'Editar labor' : 'Nueva labor'} abierta={panel?.tipo === 'labor'} onCerrar={cerrar}>
        {panel?.tipo === 'labor' && insumos && aplicados && (
          <FormLabor key={panel.labor?.id ?? 'nueva'} labor={panel.labor} cultivoId={cultivo.id} espacioId={espacio.id} haCultivo={cultivo.hectareas}
            insumos={insumos} aplicados={aplicados.filter((a) => a.laborId === panel.labor?.id)} onListo={cerrar} />
        )}
      </Hoja>
      <Hoja titulo={panel?.tipo === 'cosecha' && panel.cosecha ? 'Editar cosecha' : 'Cargar cosecha'} abierta={panel?.tipo === 'cosecha'} onCerrar={cerrar}>
        {panel?.tipo === 'cosecha' && (
          <FormCosecha key={panel.cosecha?.id ?? 'nueva'} cosecha={panel.cosecha} cultivoId={cultivo.id} espacioId={espacio.id} ha={cultivo.hectareas} unidad={u} onListo={cerrar} />
        )}
      </Hoja>
      <Hoja titulo={panel?.tipo === 'venta' && panel.venta ? 'Editar venta' : 'Cargar venta'} abierta={panel?.tipo === 'venta'} onCerrar={cerrar}>
        {panel?.tipo === 'venta' && (
          <FormVenta key={panel.venta?.id ?? 'nueva'} venta={panel.venta} cultivoId={cultivo.id} espacioId={espacio.id} unidad={u}
            precioSugerido={cultivo.precioEstimado} onListo={cerrar} />
        )}
      </Hoja>
    </Pantalla>
  );
}

// ---------------- Labor con insumos ----------------
interface FilaInsumo { clave: string; insumoId: string; dosis: string; precio: ImporteForm }

const TIPOS_LABOR = Object.keys(LABORES) as TipoLabor[];

function FormLabor({ labor, cultivoId, espacioId, haCultivo, insumos, aplicados, onListo }: {
  labor?: Labor; cultivoId: string; espacioId: string; haCultivo: number; insumos: Insumo[]; aplicados: InsumoAplicado[]; onListo: () => void;
}) {
  const { tipoCambio, setTipoCambio } = useEspacio();
  const [tipo, setTipo] = useState<TipoLabor>(labor?.tipo ?? 'siembra');
  const [dia, setDia] = useState(labor?.fecha ?? hoy());
  const [ha, setHa] = useState(String(labor?.hectareas ?? haCultivo).replace('.', ','));
  const [modalidad, setModalidad] = useState<'contratada' | 'propia'>(labor?.modalidad ?? 'contratada');
  const [costo, setCosto] = useState(formDeImporte(labor?.costoPorHa, tipoCambio));
  const [notas, setNotas] = useState(labor?.notas ?? '');
  const [filas, setFilas] = useState<FilaInsumo[]>(() => aplicados.map((a) => ({
    clave: a.id, insumoId: a.insumoId, dosis: String(a.dosisPorHa).replace('.', ','), precio: formDeImporte(a.precioUnitario, tipoCambio),
  })));
  const [creando, setCreando] = useState<string | null>(null); // clave de la fila que crea un insumo
  const [error, setError] = useState<string | null>(null);

  const catalogo = useLiveQuery(() => db.insumos.where('espacioId').equals(espacioId).sortBy('nombre'), [espacioId]) ?? insumos;

  const subtotalHa = useMemo(() => {
    try {
      const c = aUsd(importeDeForm(costo, ''));
      const i = filas.reduce((s, f) => s + (leerNumero(f.dosis) || 0) * aUsd(importeDeForm(f.precio, '')), 0);
      return c + i;
    } catch { return null; }
  }, [costo, filas]);

  const cambiarFila = (clave: string, cambio: Partial<FilaInsumo>) => setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));
  const elegirInsumo = (clave: string, insumoId: string) => {
    if (insumoId === '__nuevo') { setCreando(clave); return; }
    const ins = catalogo.find((i) => i.id === insumoId);
    cambiarFila(clave, { insumoId, ...(ins?.precioReferencia ? { precio: formDeImporte(ins.precioReferencia, tipoCambio) } : {}) });
  };

  return (
    <Formulario
      error={error}
      onBorrar={labor ? async () => { if (confirm('¿Borrar esta labor y sus insumos?')) { await borrarLabor(labor.id); onListo(); } } : undefined}
      onGuardar={async () => {
        try {
          const hectareas = leerNumero(ha);
          if (!(hectareas > 0)) return setError('Las hectáreas tienen que ser mayores a 0.');
          const costoPorHa = importeDeForm(costo, 'costo de la labor');
          const nuevasFilas: Omit<InsumoAplicado, 'laborId'>[] = [];
          for (const f of filas) {
            if (!f.insumoId) continue;
            const dosis = leerNumero(f.dosis);
            const nombre = catalogo.find((i) => i.id === f.insumoId)?.nombre ?? 'insumo';
            if (!(dosis > 0)) return setError(`Falta la dosis por hectárea de ${nombre}.`);
            const precio = importeDeForm(f.precio, `precio de ${nombre}`);
            if (!precio) return setError(`Falta el precio de ${nombre}.`);
            nuevasFilas.push({ id: nuevoId(), espacioId, insumoId: f.insumoId, dosisPorHa: dosis, precioUnitario: precio });
          }
          const tc = [costoPorHa, ...nuevasFilas.map((n) => n.precioUnitario)].find((i) => i?.moneda === 'ARS');
          if (tc) setTipoCambio(tc.tipoCambio);

          const laborId = labor?.id ?? nuevoId();
          await db.transaction('rw', db.labores, db.insumosAplicados, db.insumos, async () => {
            await db.labores.put({
              id: laborId, espacioId, cultivoEnLoteId: cultivoId, tipo, fecha: dia || hoy(), hectareas, modalidad,
              costoPorHa: costoPorHa && costoPorHa.monto !== 0 ? costoPorHa : undefined, notas: notas.trim() || undefined,
            });
            await db.insumosAplicados.where('laborId').equals(laborId).delete();
            await db.insumosAplicados.bulkAdd(nuevasFilas.map((n) => ({ ...n, laborId })));
            // En una labor nueva, el precio usado queda como referencia en el catálogo.
            if (!labor) for (const n of nuevasFilas) await db.insumos.update(n.insumoId, { precioReferencia: n.precioUnitario });
          });
          onListo();
        } catch (e) { setError((e as Error).message); }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Labor">{(id) => (
          <Selector id={id} value={tipo} onChange={(e) => setTipo(e.target.value as TipoLabor)}>
            {TIPOS_LABOR.map((t) => <option key={t} value={t}>{LABORES[t]}</option>)}
          </Selector>
        )}</Campo>
        <Campo etiqueta="Fecha">{(id) => <Entrada id={id} type="date" value={dia} onChange={(e) => setDia(e.target.value)} />}</Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Hectáreas">{(id) => <EntradaNumero id={id} valor={ha} onCambio={setHa} sufijo="ha" />}</Campo>
        <Campo etiqueta="¿Quién la hizo?">{() => (
          <Opciones valor={modalidad} onCambio={setModalidad} opciones={[{ valor: 'contratada', texto: 'Contratista' }, { valor: 'propia', texto: 'Propia' }]} />
        )}</Campo>
      </div>
      <Campo etiqueta={modalidad === 'contratada' ? 'Tarifa del contratista por ha' : 'Costo propio estimado por ha'}
        ayuda={modalidad === 'propia' ? 'Gasoil, mantenimiento y mano de obra. Si no lo sabés, poné lo que cobraría un contratista.' : 'Sin los insumos: esos van abajo.'}>
        {(id) => <EntradaImporte id={id} valor={costo} onCambio={setCosto} sufijo="/ha" />}
      </Campo>

      <div className="space-y-3 rounded-2xl bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-campo-900">Insumos aplicados</span>
          <BotonAgregar onClick={() => setFilas((fs) => [...fs, { clave: nuevoId(), insumoId: '', dosis: '', precio: importeVacio(tipoCambio) }])}>Insumo</BotonAgregar>
        </div>
        {filas.length === 0 && <p className="text-sm text-stone-500">Semillas, fertilizantes, herbicidas, gasoil… lo que se usó en esta labor.</p>}
        {filas.map((f) => {
          const ins = catalogo.find((i) => i.id === f.insumoId);
          return (
            <div key={f.clave} className="space-y-2 rounded-xl border border-stone-200 p-3">
              <div className="flex gap-2">
                <Selector value={f.insumoId} onChange={(e) => elegirInsumo(f.clave, e.target.value)} className="flex-1" aria-label="Insumo">
                  <option value="">Elegí un insumo…</option>
                  {catalogo.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  <option value="__nuevo">+ Nuevo insumo…</option>
                </Selector>
                <button type="button" aria-label="Quitar insumo" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-stone-400 hover:bg-stone-100"
                  onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}>✕</button>
              </div>
              {creando === f.clave && (
                <NuevoInsumoRapido espacioId={espacioId} onCreado={(nuevo) => { setCreando(null); cambiarFila(f.clave, { insumoId: nuevo }); }} onCancelar={() => setCreando(null)} />
              )}
              {f.insumoId && (
                <div className="space-y-2">
                  <Campo etiqueta="Dosis por hectárea">{(id) => (
                    <EntradaNumero id={id} valor={f.dosis} onCambio={(dosis) => cambiarFila(f.clave, { dosis })} sufijo={`${ins ? UNIDADES_INSUMO[ins.unidad] : ''}/ha`} placeholder="0" />
                  )}</Campo>
                  <Campo etiqueta={`Precio por ${ins ? UNIDADES_INSUMO[ins.unidad] : 'unidad'}`}>{(id) => (
                    <EntradaImporte id={id} valor={f.precio} onCambio={(precio) => cambiarFila(f.clave, { precio })} placeholder="0" />
                  )}</Campo>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Campo etiqueta="Notas (opcional)">{(id) => <Entrada id={id} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Contratista, producto, condiciones…" />}</Campo>
      <div className="flex items-baseline justify-between rounded-xl bg-campo-50 px-3 py-2">
        <span className="text-sm font-semibold text-campo-900">Total de esta labor</span>
        <span className="num font-bold text-campo-800">{subtotalHa === null ? '—' : `US$ ${numero(subtotalHa, 2)}/ha`}</span>
      </div>
    </Formulario>
  );
}

function NuevoInsumoRapido({ espacioId, onCreado, onCancelar }: { espacioId: string; onCreado: (id: string) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<CategoriaInsumo>('herbicida');
  const [unidad, setUnidad] = useState<UnidadInsumo>('l');
  return (
    <div className="space-y-2 rounded-xl bg-campo-50 p-3">
      <Entrada value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej. Glifosato 66%)" autoFocus aria-label="Nombre del insumo" />
      <div className="grid grid-cols-2 gap-2">
        <Selector value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaInsumo)} aria-label="Categoría">
          {Object.entries(CATEGORIAS_INSUMO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Selector>
        <Selector value={unidad} onChange={(e) => setUnidad(e.target.value as UnidadInsumo)} aria-label="Unidad">
          {Object.entries(UNIDADES_INSUMO).map(([k, v]) => <option key={k} value={k}>por {v}</option>)}
        </Selector>
      </div>
      <div className="flex gap-2">
        <Boton chico variante="fantasma" onClick={onCancelar}>Cancelar</Boton>
        <Boton chico className="flex-1" disabled={!nombre.trim()} onClick={async () => {
          const id = nuevoId();
          await db.insumos.add({ id, espacioId, nombre: nombre.trim(), categoria, unidad });
          onCreado(id);
        }}>Crear insumo</Boton>
      </div>
    </div>
  );
}

// ---------------- Cosecha ----------------
function FormCosecha({ cosecha, cultivoId, espacioId, ha, unidad, onListo }: {
  cosecha?: Cosecha; cultivoId: string; espacioId: string; ha: number; unidad: UnidadGrano; onListo: () => void;
}) {
  const f = factorGrano(unidad);
  const [modo, setModo] = useState<'total' | 'rinde'>('total');
  const [cantidad, setCantidad] = useState(cosecha ? String(cosecha.kg / f).replace('.', ',') : '');
  const [dia, setDia] = useState(cosecha?.fecha ?? hoy());
  const [error, setError] = useState<string | null>(null);
  const n = leerNumero(cantidad);
  const kg = Number.isNaN(n) ? 0 : modo === 'total' ? n * f : n * f * ha;
  return (
    <Formulario
      error={error}
      onBorrar={cosecha ? async () => { if (confirm('¿Borrar esta cosecha?')) { await db.cosechas.delete(cosecha.id); onListo(); } } : undefined}
      onGuardar={async () => {
        if (!(kg > 0)) return setError('Cargá cuánto cosechaste.');
        await db.cosechas.put({ id: cosecha?.id ?? nuevoId(), espacioId, cultivoEnLoteId: cultivoId, fecha: dia || hoy(), kg });
        onListo();
      }}
    >
      {!cosecha && (
        <Campo etiqueta="¿Cómo lo querés cargar?">{() => (
          <Opciones valor={modo} onCambio={(m) => { setModo(m); setCantidad(''); }} opciones={[{ valor: 'total', texto: 'Total cosechado' }, { valor: 'rinde', texto: 'Rinde por ha' }]} />
        )}</Campo>
      )}
      <Campo etiqueta={modo === 'total' ? 'Cantidad cosechada' : 'Rinde promedio'}
        ayuda={kg > 0 ? (modo === 'total' ? `Rinde: ${rinde(kg / ha, unidad)}` : `Total: ${grano(kg, unidad)} en ${numero(ha)} ha`) : undefined}>
        {(id) => <EntradaNumero id={id} valor={cantidad} onCambio={setCantidad} sufijo={modo === 'total' ? unidad : `${unidad}/ha`} autoFocus />}
      </Campo>
      <Campo etiqueta="Fecha">{(id) => <Entrada id={id} type="date" value={dia} onChange={(e) => setDia(e.target.value)} />}</Campo>
    </Formulario>
  );
}

// ---------------- Venta ----------------
interface FilaGasto { clave: string; concepto: string; importe: ImporteForm }
const GASTOS_TIPICOS = ['Flete', 'Comisión', 'Secada', 'Paritaria', 'Sellado'];

function FormVenta({ venta, cultivoId, espacioId, unidad, precioSugerido, onListo }: {
  venta?: Venta; cultivoId: string; espacioId: string; unidad: UnidadGrano; precioSugerido?: Venta['precioPorTn']; onListo: () => void;
}) {
  const { tipoCambio, setTipoCambio } = useEspacio();
  const f = factorGrano(unidad);
  const [cantidad, setCantidad] = useState(venta ? String(venta.kg / f).replace('.', ',') : '');
  const [precio, setPrecio] = useState(formDeImporte(venta?.precioPorTn ?? precioSugerido, tipoCambio));
  const [dia, setDia] = useState(venta?.fecha ?? hoy());
  const [comprador, setComprador] = useState(venta?.comprador ?? '');
  const [gastos, setGastos] = useState<FilaGasto[]>(() => (venta?.gastosComerciales ?? []).map((g) => ({
    clave: nuevoId(), concepto: g.concepto, importe: formDeImporte(g.importe, tipoCambio),
  })));
  const [error, setError] = useState<string | null>(null);

  const kg = (leerNumero(cantidad) || 0) * f;
  const resumen = (() => {
    try {
      const bruto = (kg * aUsd(importeDeForm(precio, ''))) / 1000;
      const g = gastos.reduce((s, x) => s + aUsd(importeDeForm(x.importe, '')), 0);
      return { bruto, g, neto: bruto - g };
    } catch { return null; }
  })();

  return (
    <Formulario
      error={error}
      onBorrar={venta ? async () => { if (confirm('¿Borrar esta venta?')) { await db.ventas.delete(venta.id); onListo(); } } : undefined}
      onGuardar={async () => {
        try {
          if (!(kg > 0)) return setError('Cargá cuánto vendiste.');
          const p = importeDeForm(precio, 'precio');
          if (!p || p.monto <= 0) return setError('Cargá el precio por tonelada.');
          const gc = [];
          for (const g of gastos) {
            const imp = importeDeForm(g.importe, g.concepto || 'gasto');
            if (imp && imp.monto !== 0) gc.push({ concepto: g.concepto.trim() || 'Gasto', importe: imp });
          }
          const ars = [p, ...gc.map((g) => g.importe)].find((i) => i.moneda === 'ARS');
          if (ars) setTipoCambio(ars.tipoCambio);
          await db.ventas.put({
            id: venta?.id ?? nuevoId(), espacioId, cultivoEnLoteId: cultivoId, fecha: dia || hoy(), kg,
            precioPorTn: p, comprador: comprador.trim() || undefined, gastosComerciales: gc,
          });
          onListo();
        } catch (e) { setError((e as Error).message); }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Cantidad">{(id) => <EntradaNumero id={id} valor={cantidad} onCambio={setCantidad} sufijo={unidad} autoFocus={!venta} />}</Campo>
        <Campo etiqueta="Fecha">{(id) => <Entrada id={id} type="date" value={dia} onChange={(e) => setDia(e.target.value)} />}</Campo>
      </div>
      <Campo etiqueta="Precio por tonelada">{(id) => <EntradaImporte id={id} valor={precio} onCambio={setPrecio} sufijo="/tn" />}</Campo>
      <Campo etiqueta="Comprador (opcional)">{(id) => <Entrada id={id} value={comprador} onChange={(e) => setComprador(e.target.value)} placeholder="Acopio, cooperativa, exportador…" />}</Campo>

      <div className="space-y-3 rounded-2xl bg-white p-3">
        <span className="text-sm font-bold text-campo-900">Gastos de comercialización</span>
        <div className="flex flex-wrap gap-1.5">
          {GASTOS_TIPICOS.filter((t) => !gastos.some((g) => g.concepto === t)).map((t) => (
            <button key={t} type="button" onClick={() => setGastos((gs) => [...gs, { clave: nuevoId(), concepto: t, importe: importeVacio(tipoCambio) }])}
              className="rounded-full bg-campo-50 px-3 py-1.5 text-sm font-semibold text-campo-800 ring-1 ring-campo-800/15">+ {t}</button>
          ))}
          <button type="button" onClick={() => setGastos((gs) => [...gs, { clave: nuevoId(), concepto: '', importe: importeVacio(tipoCambio) }])}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-stone-600 ring-1 ring-stone-300">+ Otro</button>
        </div>
        {gastos.map((g) => (
          <div key={g.clave} className="space-y-2 rounded-xl border border-stone-200 p-3">
            <div className="flex gap-2">
              <Entrada value={g.concepto} onChange={(e) => setGastos((gs) => gs.map((x) => (x.clave === g.clave ? { ...x, concepto: e.target.value } : x)))} placeholder="Concepto" aria-label="Concepto" />
              <button type="button" aria-label="Quitar gasto" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-stone-400 hover:bg-stone-100"
                onClick={() => setGastos((gs) => gs.filter((x) => x.clave !== g.clave))}>✕</button>
            </div>
            <EntradaImporte valor={g.importe} onCambio={(importe) => setGastos((gs) => gs.map((x) => (x.clave === g.clave ? { ...x, importe } : x)))} placeholder="Total del gasto" />
          </div>
        ))}
        {gastos.length > 0 && <p className="text-xs text-stone-500">Cargá el total de cada gasto para esta venta (no por tonelada).</p>}
      </div>
      {resumen && kg > 0 && (
        <div className={cx('rounded-xl bg-campo-50 px-3 py-2 text-sm')}>
          <div className="flex justify-between"><span>Bruto</span><span className="num">US$ {numero(resumen.bruto)}</span></div>
          {resumen.g > 0 && <div className="flex justify-between"><span>Gastos</span><span className="num">− US$ {numero(resumen.g)}</span></div>}
          <div className="flex justify-between font-bold text-campo-900"><span>Neto</span><span className="num">US$ {numero(resumen.neto)}</span></div>
        </div>
      )}
    </Formulario>
  );
}
