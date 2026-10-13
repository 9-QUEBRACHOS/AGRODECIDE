import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { db, nuevoId } from '../db/baseDatos';
import { borrarLote } from '../db/operaciones';
import { useEspacio } from '../estado';
import { CULTIVOS, MODALIDADES_ALQUILER } from '../modelo/etiquetas';
import type { AlquilerLote, CultivoEnLote, Lote, ModalidadAlquiler, TipoCultivo, UnidadGrano } from '../modelo/tipos';
import { alquilerTotalLote } from '../calculos/margen';
import { aUsd } from '../calculos/moneda';
import {
  BotonAgregar, Boton, Campo, Dato, Entrada, EntradaImporte, EntradaNumero, Etiqueta, FilaLink, formDeImporte,
  Formulario, Hoja, importeDeForm, Opciones, Pantalla, Selector, Tarjeta, TituloSeccion, Vacio,
} from '../componentes/ui';
import { dinero, factorGrano, leerNumero, numero } from '../utilidades/formato';
import { FormLote } from './Lotes';

export default function LoteDetalle() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { espacio, campania, tipoCambio } = useEspacio();
  const lote = useLiveQuery(() => db.lotes.get(id ?? ''), [id]);
  const campos = useLiveQuery(() => db.campos.where('espacioId').equals(espacio.id).toArray(), [espacio.id]);
  const alquiler = useLiveQuery(
    () => (campania && id ? db.alquileres.where({ loteId: id, campaniaId: campania.id }).first() : undefined), [id, campania?.id]);
  const cultivos = useLiveQuery(
    () => (campania && id ? db.cultivos.where('loteId').equals(id).filter((c) => c.campaniaId === campania.id).toArray() : []), [id, campania?.id]);

  const [editar, setEditar] = useState(false);
  const [editAlquiler, setEditAlquiler] = useState(false);
  const [nuevoCultivo, setNuevoCultivo] = useState(false);

  if (lote === undefined || !campos) return null;
  if (lote === null || !lote) return <Pantalla titulo="Lote no encontrado" volver="/lotes"><Vacio titulo="Este lote ya no existe." /></Pantalla>;

  const campo = campos.find((c) => c.id === lote.campoId);
  const sumaPorcentajes = (cultivos ?? []).reduce((s, c) => s + (c.porcentajeAlquiler ?? 0), 0);
  const alquilerReparte = alquiler && alquiler.modalidad !== 'porcentaje_cosecha';
  const esPropio = lote.tenencia === 'propio';

  return (
    <Pantalla titulo={lote.nombre} subtitulo={`${campo?.nombre ?? ''} · ${numero(lote.hectareas, lote.hectareas % 1 ? 1 : 0)} ha · ${esPropio ? 'Propio' : 'Alquilado'}`} volver="/lotes"
      acciones={<Boton chico variante="fantasma" onClick={() => setEditar(true)}>Editar</Boton>}>

      {!campania ? <Vacio titulo="Creá una campaña en Ajustes para cargar cultivos." /> : (
        <>
          <TituloSeccion accion={(cultivos?.length ?? 0) > 0 && <BotonAgregar onClick={() => setNuevoCultivo(true)}>Cultivo</BotonAgregar>}>
            Cultivos {campania.nombre}
          </TituloSeccion>
          {(cultivos ?? []).length === 0 ? (
            <Vacio titulo="¿Qué sembraste en este lote?" texto="Si hacés doble cultivo (por ejemplo trigo y soja de 2da), cargá los dos."
              accion={<Boton onClick={() => setNuevoCultivo(true)}>Agregar cultivo</Boton>} />
          ) : (
            <Tarjeta className="py-1">
              <div className="divide-y divide-stone-100">
                {cultivos!.map((c) => (
                  <FilaLink key={c.id} to={`/cultivos/${c.id}`}
                    titulo={<>{nombreCultivo(c)}{c.ciclo === 'segunda' && <span className="font-normal text-stone-500"> de 2da</span>}</>}
                    detalle={`${numero(c.hectareas)} ha${alquilerReparte && cultivos!.length > 1 ? ` · absorbe ${numero(c.porcentajeAlquiler)}% del alquiler` : ''}`} />
                ))}
              </div>
            </Tarjeta>
          )}
          {alquilerReparte && (cultivos?.length ?? 0) > 0 && Math.abs(sumaPorcentajes - 100) > 0.01 && (
            <p className="rounded-xl bg-trigo/20 px-3 py-2 text-sm">
              Los cultivos absorben {numero(sumaPorcentajes)}% del alquiler en total (debería ser 100%). Ajustalo dentro de cada cultivo.
            </p>
          )}

          <TituloSeccion>{esPropio ? 'Alquiler de referencia' : 'Alquiler'} {campania.nombre}</TituloSeccion>
          <Tarjeta>
            {alquiler ? (
              <button className="block w-full text-left" onClick={() => setEditAlquiler(true)}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-campo-900">{describirAlquiler(alquiler)}</span>
                  <span className="text-sm font-semibold text-campo-700">Editar</span>
                </div>
                {alquiler.modalidad !== 'porcentaje_cosecha' && (
                  <div className="mt-1">
                    <Dato etiqueta="Total del lote" valor={dinero(alquilerTotalLote(alquiler, lote.hectareas), espacio.monedaReporte, tipoCambio)} />
                    <Dato etiqueta="Por hectárea" valor={dinero(alquilerTotalLote(alquiler, lote.hectareas) / lote.hectareas, espacio.monedaReporte, tipoCambio)} />
                  </div>
                )}
                {esPropio && <p className="mt-1 text-xs text-stone-500">Es un costo de oportunidad: lo que cobrarías si lo alquilaras. Los resultados muestran el margen con y sin él.</p>}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stone-600">
                  {esPropio
                    ? 'El campo es propio, pero si lo alquilaras cobrarías algo. Cargá ese valor para ver si te conviene más producir o alquilar.'
                    : 'Cargá cuánto pagás de alquiler esta campaña.'}
                </p>
                <Boton variante="secundario" onClick={() => setEditAlquiler(true)}>{esPropio ? 'Cargar alquiler de referencia' : 'Cargar alquiler'}</Boton>
              </div>
            )}
          </Tarjeta>
        </>
      )}

      <Hoja titulo="Editar lote" abierta={editar} onCerrar={() => setEditar(false)}>
        <FormLote lote={lote} espacioId={espacio.id} campos={campos} onListo={() => setEditar(false)}
          onBorrar={async () => {
            if (confirm(`¿Borrar "${lote.nombre}" con todos sus cultivos, labores, cosechas y ventas? No se puede deshacer.`)) {
              await borrarLote(lote.id); navegar('/lotes', { replace: true });
            }
          }} />
      </Hoja>
      {campania && (
        <>
          <Hoja titulo={esPropio ? 'Alquiler de referencia' : 'Alquiler'} abierta={editAlquiler} onCerrar={() => setEditAlquiler(false)}>
            <FormAlquiler lote={lote} campaniaId={campania.id} alquiler={alquiler} tipoCambio={tipoCambio} onListo={() => setEditAlquiler(false)} />
          </Hoja>
          <Hoja titulo="Nuevo cultivo" abierta={nuevoCultivo} onCerrar={() => setNuevoCultivo(false)}>
            <FormCultivo lote={lote} campaniaId={campania.id} otros={cultivos ?? []} unidad={espacio.unidadGrano} tipoCambio={tipoCambio}
              onListo={(nuevo) => { setNuevoCultivo(false); if (nuevo) navegar(`/cultivos/${nuevo}`); }} />
          </Hoja>
        </>
      )}
    </Pantalla>
  );
}

export const nombreCultivo = (c: CultivoEnLote) => (c.cultivo === 'otro' ? c.nombreCultivo || 'Otro' : CULTIVOS[c.cultivo]);

function describirAlquiler(a: AlquilerLote) {
  switch (a.modalidad) {
    case 'qq_soja_ha': return `${numero(a.valor, 1)} qq de soja/ha${a.precioSojaReferencia ? ` · soja a US$ ${numero(aUsd(a.precioSojaReferencia))}/tn` : ''}`;
    case 'monto_ha': return `${a.importePorHa?.moneda === 'ARS' ? '$' : 'US$'} ${numero(a.importePorHa?.monto ?? 0)} por ha`;
    case 'porcentaje_cosecha': return `${numero(a.valor, 1)}% de la cosecha`;
  }
}

function FormAlquiler({ lote, campaniaId, alquiler, tipoCambio, onListo }: { lote: Lote; campaniaId: string; alquiler?: AlquilerLote; tipoCambio: number; onListo: () => void }) {
  const { setTipoCambio } = useEspacio();
  const [modalidad, setModalidad] = useState<ModalidadAlquiler>(alquiler?.modalidad ?? 'qq_soja_ha');
  const [valor, setValor] = useState(alquiler && alquiler.modalidad !== 'monto_ha' ? String(alquiler.valor).replace('.', ',') : '');
  const [precioSoja, setPrecioSoja] = useState(formDeImporte(alquiler?.precioSojaReferencia, tipoCambio));
  const [porHa, setPorHa] = useState(formDeImporte(alquiler?.importePorHa, tipoCambio));
  const [notas, setNotas] = useState(alquiler?.notas ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <Formulario
      error={error}
      onBorrar={alquiler ? async () => { if (confirm('¿Borrar el alquiler de esta campaña?')) { await db.alquileres.delete(alquiler.id); onListo(); } } : undefined}
      onGuardar={async () => {
        try {
          const datos: Omit<AlquilerLote, 'id'> = {
            espacioId: lote.espacioId, loteId: lote.id, campaniaId,
            tipo: lote.tenencia === 'propio' ? 'referencia' : 'contrato',
            modalidad, valor: 0, notas: notas.trim() || undefined,
          };
          if (modalidad === 'monto_ha') {
            const imp = importeDeForm(porHa, 'monto por ha');
            if (!imp || imp.monto <= 0) return setError('Cargá el monto por hectárea.');
            datos.importePorHa = imp; datos.valor = imp.monto;
            if (imp.moneda === 'ARS') setTipoCambio(imp.tipoCambio);
          } else {
            const v = leerNumero(valor);
            if (!(v > 0)) return setError(modalidad === 'qq_soja_ha' ? 'Cargá los quintales por hectárea.' : 'Cargá el porcentaje.');
            if (modalidad === 'porcentaje_cosecha' && v > 100) return setError('El porcentaje no puede ser mayor a 100.');
            datos.valor = v;
            if (modalidad === 'qq_soja_ha') {
              const p = importeDeForm(precioSoja, 'precio de la soja');
              if (!p || p.monto <= 0) return setError('Cargá el precio de la soja por tonelada para poder valuar el alquiler.');
              datos.precioSojaReferencia = p;
            }
          }
          // Uno solo por lote y campaña: si ya existe (por ejemplo, por un doble toque), se reemplaza.
          const existente = alquiler ?? await db.alquileres.where({ loteId: lote.id, campaniaId }).first();
          await db.alquileres.put({ ...datos, id: existente?.id ?? nuevoId() });
          onListo();
        } catch (e) { setError((e as Error).message); }
      }}
    >
      <Campo etiqueta="Modalidad">{(id) => (
        <Selector id={id} value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadAlquiler)}>
          {Object.entries(MODALIDADES_ALQUILER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Selector>
      )}</Campo>
      {modalidad === 'qq_soja_ha' && (
        <>
          <Campo etiqueta="Quintales de soja por hectárea">{(id) => <EntradaNumero id={id} valor={valor} onCambio={setValor} sufijo="qq/ha" />}</Campo>
          <Campo etiqueta="Precio de la soja para valuarlo" ayuda="Por tonelada. Usá el precio del contrato o el de la fecha de pago.">
            {(id) => <EntradaImporte id={id} valor={precioSoja} onCambio={setPrecioSoja} sufijo="/tn" />}
          </Campo>
        </>
      )}
      {modalidad === 'monto_ha' && (
        <Campo etiqueta="Monto por hectárea">{(id) => <EntradaImporte id={id} valor={porHa} onCambio={setPorHa} sufijo="/ha" />}</Campo>
      )}
      {modalidad === 'porcentaje_cosecha' && (
        <Campo etiqueta="Porcentaje de la cosecha" ayuda="Se aplica a la producción de cada cultivo del lote, valuada a su precio.">
          {(id) => <EntradaNumero id={id} valor={valor} onCambio={setValor} sufijo="%" />}
        </Campo>
      )}
      <Campo etiqueta="Notas (opcional)">{(id) => <Entrada id={id} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Pago en 2 cuotas, mayo y octubre" />}</Campo>
    </Formulario>
  );
}

export function FormCultivo({ lote, campaniaId, cultivo, otros, unidad, tipoCambio, onListo, onBorrar }: {
  lote: Lote; campaniaId: string; cultivo?: CultivoEnLote; otros: CultivoEnLote[]; unidad: UnidadGrano; tipoCambio: number;
  onListo: (nuevoId?: string) => void; onBorrar?: () => void;
}) {
  const { setTipoCambio } = useEspacio();
  const hermanos = otros.filter((o) => o.id !== cultivo?.id);
  const f = factorGrano(unidad);
  const [tipo, setTipo] = useState<TipoCultivo>(cultivo?.cultivo ?? 'soja');
  const [nombreOtro, setNombreOtro] = useState(cultivo?.nombreCultivo ?? '');
  const [ciclo, setCiclo] = useState<'primera' | 'segunda'>(cultivo?.ciclo ?? (hermanos.length ? 'segunda' : 'primera'));
  const [ha, setHa] = useState(String(cultivo?.hectareas ?? lote.hectareas).replace('.', ','));
  const [siembra, setSiembra] = useState(cultivo?.fechaSiembra ?? '');
  const [rindeEst, setRindeEst] = useState(cultivo?.rindeEstimadoKgHa ? String(cultivo.rindeEstimadoKgHa / f).replace('.', ',') : '');
  const [precio, setPrecio] = useState(formDeImporte(cultivo?.precioEstimado, tipoCambio));
  const [porcentaje, setPorcentaje] = useState(String(cultivo?.porcentajeAlquiler ?? 100));
  const [repartir, setRepartir] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <Formulario
      error={error}
      onBorrar={onBorrar}
      onGuardar={async () => {
        try {
          const hectareas = leerNumero(ha);
          if (!(hectareas > 0)) return setError('Las hectáreas tienen que ser mayores a 0.');
          if (hectareas > lote.hectareas + 1e-9) return setError(`El lote tiene ${numero(lote.hectareas)} ha; el cultivo no puede ocupar más.`);
          const r = leerNumero(rindeEst);
          const p = importeDeForm(precio, 'precio estimado');
          if (p?.moneda === 'ARS') setTipoCambio(p.tipoCambio);
          const pct = leerNumero(porcentaje);
          const datos = {
            espacioId: lote.espacioId, loteId: lote.id, campaniaId,
            cultivo: tipo, nombreCultivo: tipo === 'otro' ? nombreOtro.trim() || undefined : undefined,
            ciclo, hectareas,
            fechaSiembra: siembra || undefined,
            rindeEstimadoKgHa: r > 0 ? r * f : undefined,
            precioEstimado: p && p.monto > 0 ? p : undefined,
          };
          if (cultivo) {
            if (!(pct >= 0 && pct <= 100)) return setError('El porcentaje del alquiler va de 0 a 100.');
            await db.cultivos.update(cultivo.id, { ...datos, porcentajeAlquiler: pct });
            onListo();
          } else {
            const id = nuevoId();
            const n = hermanos.length + 1;
            await db.transaction('rw', db.cultivos, async () => {
              if (hermanos.length && repartir) {
                for (const h of hermanos) await db.cultivos.update(h.id, { porcentajeAlquiler: 100 / n });
              }
              await db.cultivos.add({ ...datos, id, porcentajeAlquiler: hermanos.length ? (repartir ? 100 / n : 0) : 100 });
            });
            onListo(id);
          }
        } catch (e) { setError((e as Error).message); }
      }}
    >
      <Campo etiqueta="Cultivo">{(id) => (
        <Selector id={id} value={tipo} onChange={(e) => setTipo(e.target.value as TipoCultivo)}>
          {Object.entries(CULTIVOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Selector>
      )}</Campo>
      {tipo === 'otro' && <Campo etiqueta="¿Cuál?">{(id) => <Entrada id={id} value={nombreOtro} onChange={(e) => setNombreOtro(e.target.value)} placeholder="Arveja, colza…" />}</Campo>}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Ciclo">{() => <Opciones valor={ciclo} onCambio={setCiclo} opciones={[{ valor: 'primera', texto: '1ra' }, { valor: 'segunda', texto: '2da' }]} />}</Campo>
        <Campo etiqueta="Superficie">{(id) => <EntradaNumero id={id} valor={ha} onCambio={setHa} sufijo="ha" />}</Campo>
      </div>
      <Campo etiqueta="Fecha de siembra (opcional)">{(id) => <Entrada id={id} type="date" value={siembra} onChange={(e) => setSiembra(e.target.value)} />}</Campo>
      <div className="rounded-2xl bg-white p-3">
        <p className="mb-3 text-sm text-stone-600">
          <Etiqueta tono="proyectado">Para proyectar</Etiqueta> Con rinde y precio estimados ves el margen antes de cosechar.
        </p>
        <div className="space-y-3">
          <Campo etiqueta="Rinde estimado">{(id) => <EntradaNumero id={id} valor={rindeEst} onCambio={setRindeEst} sufijo={`${unidad}/ha`} placeholder="0" />}</Campo>
          <Campo etiqueta="Precio estimado de venta" ayuda="Por tonelada, neto de lo que te paga el comprador.">{(id) => <EntradaImporte id={id} valor={precio} onCambio={setPrecio} sufijo="/tn" />}</Campo>
        </div>
      </div>
      {cultivo && (hermanos.length > 0 || cultivo.porcentajeAlquiler !== 100) && (
        <Campo etiqueta="Parte del alquiler del lote que absorbe" ayuda="Entre todos los cultivos del lote tiene que sumar 100%.">
          {(id) => <EntradaNumero id={id} valor={porcentaje} onCambio={setPorcentaje} sufijo="%" />}
        </Campo>
      )}
      {!cultivo && hermanos.length > 0 && (
        <label className="flex items-start gap-3 rounded-2xl bg-white p-3 text-sm">
          <input type="checkbox" checked={repartir} onChange={(e) => setRepartir(e.target.checked)} className="mt-0.5 h-5 w-5 accent-campo-700" />
          <span>Repartir el alquiler del lote en partes iguales entre los {hermanos.length + 1} cultivos. Después lo podés ajustar.</span>
        </label>
      )}
    </Formulario>
  );
}
