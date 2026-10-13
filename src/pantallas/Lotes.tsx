import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db, nuevoId } from '../db/baseDatos';
import { borrarCampo } from '../db/operaciones';
import { useEspacio } from '../estado';
import { CULTIVOS } from '../modelo/etiquetas';
import type { AlquilerLote, Campo as TCampo, Lote, Moneda, Tenencia } from '../modelo/tipos';
import { alquilerTotalLote } from '../calculos/margen';
import { BotonAgregar, Boton, Campo, Entrada, EntradaNumero, FilaLink, Formulario, Hoja, Opciones, Pantalla, Selector, Tarjeta, Vacio } from '../componentes/ui';
import { dinero, leerNumero, numero } from '../utilidades/formato';

export default function Lotes() {
  const { espacio, campania, tipoCambio } = useEspacio();
  const navegar = useNavigate();
  const campos = useLiveQuery(() => db.campos.where('espacioId').equals(espacio.id).sortBy('nombre'), [espacio.id]);
  const lotes = useLiveQuery(() => db.lotes.where('espacioId').equals(espacio.id).sortBy('nombre'), [espacio.id]);
  const alquileres = useLiveQuery(
    () => (campania ? db.alquileres.where('campaniaId').equals(campania.id).toArray() : []), [campania?.id]);
  const cultivos = useLiveQuery(
    () => (campania ? db.cultivos.where('campaniaId').equals(campania.id).toArray() : []), [campania?.id]);

  const [editCampo, setEditCampo] = useState<TCampo | 'nuevo' | null>(null);
  const [nuevoLote, setNuevoLote] = useState<string | null>(null); // campoId

  if (!campos || !lotes) return null;

  return (
    <Pantalla
      titulo="Campos y lotes"
      subtitulo={campania ? `Cultivos de la campaña ${campania.nombre}` : undefined}
      acciones={campos.length > 0 && <BotonAgregar onClick={() => setEditCampo('nuevo')}>Campo</BotonAgregar>}
    >
      {campos.length === 0 && (
        <Vacio
          titulo="Empezá por tu campo"
          texto='Un campo agrupa lotes (por ejemplo "La Esperanza", con el Lote 1, Lote 2…). Si alquilás varios campos, cargá cada uno.'
          accion={<Boton onClick={() => setEditCampo('nuevo')}>Agregar campo</Boton>}
        />
      )}

      {campos.map((c) => {
        const susLotes = lotes.filter((l) => l.campoId === c.id);
        const ha = susLotes.reduce((s, l) => s + l.hectareas, 0);
        return (
          <Tarjeta key={c.id} className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <button className="min-w-0 text-left" onClick={() => setEditCampo(c)}>
                <div className="truncate text-lg font-extrabold text-campo-900">{c.nombre}</div>
                <div className="text-sm text-stone-600">
                  {[c.localidad, `${numero(ha)} ha`, `${susLotes.length} ${susLotes.length === 1 ? 'lote' : 'lotes'}`].filter(Boolean).join(' · ')}
                  <span className="ml-1 text-campo-700 underline-offset-2">· editar</span>
                </div>
              </button>
              <BotonAgregar onClick={() => setNuevoLote(c.id)}>Lote</BotonAgregar>
            </div>
            <div className="mt-2 divide-y divide-stone-100">
              {susLotes.length === 0 && <p className="py-3 text-sm text-stone-500">Sin lotes todavía.</p>}
              {susLotes.map((l) => {
                const enCampania = (cultivos ?? []).filter((cl) => cl.loteId === l.id);
                return (
                  <FilaLink
                    key={l.id}
                    to={`/lotes/${l.id}`}
                    titulo={l.nombre}
                    detalle={
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span>{numero(l.hectareas, l.hectareas % 1 ? 1 : 0)} ha · {l.tenencia === 'propio' ? 'Propio' : 'Alquilado'}</span>
                        <ChipAlquiler lote={l} alquiler={(alquileres ?? []).find((a) => a.loteId === l.id)} moneda={espacio.monedaReporte} tc={tipoCambio} />
                      </span>
                    }
                    derecha={
                      <span className="text-sm font-semibold text-campo-700">
                        {enCampania.length
                          ? enCampania.map((cl) => (cl.cultivo === 'otro' ? cl.nombreCultivo || 'Otro' : CULTIVOS[cl.cultivo]) + (cl.ciclo === 'segunda' ? ' 2da' : '')).join(' + ')
                          : <span className="font-normal text-stone-400">Sin cultivo</span>}
                      </span>
                    }
                  />
                );
              })}
            </div>
          </Tarjeta>
        );
      })}

      <Hoja titulo={editCampo === 'nuevo' ? 'Nuevo campo' : 'Editar campo'} abierta={editCampo !== null} onCerrar={() => setEditCampo(null)}>
        {editCampo !== null && (
          <FormCampo
            campo={editCampo === 'nuevo' ? undefined : editCampo}
            espacioId={espacio.id}
            provincia={espacio.provincia}
            onListo={(campoNuevoId) => { setEditCampo(null); if (campoNuevoId) setNuevoLote(campoNuevoId); }}
          />
        )}
      </Hoja>
      <Hoja titulo="Nuevo lote" abierta={nuevoLote !== null} onCerrar={() => setNuevoLote(null)}>
        {nuevoLote !== null && (
          <FormLote espacioId={espacio.id} campos={campos} campoId={nuevoLote}
            onListo={(id) => { setNuevoLote(null); if (id) navegar(`/lotes/${id}`); }} />
        )}
      </Hoja>
    </Pantalla>
  );
}

function ChipAlquiler({ lote, alquiler, moneda, tc }: { lote: Lote; alquiler?: AlquilerLote; moneda: Moneda; tc: number }) {
  if (!alquiler) {
    if (lote.tenencia === 'propio') return null;
    return <span className="rounded-full bg-trigo/25 px-2 py-0.5 text-xs font-semibold text-trigo-700">Falta el alquiler</span>;
  }
  const texto = alquiler.modalidad === 'porcentaje_cosecha'
    ? `${numero(alquiler.valor, 1)}% cosecha`
    : `${dinero(alquilerTotalLote(alquiler, lote.hectareas) / lote.hectareas, moneda, tc, 0)}/ha`;
  return <span className="rounded-full bg-campo-100 px-2 py-0.5 text-xs font-semibold text-campo-800">Alquiler {texto}</span>;
}

function FormCampo({ campo, espacioId, provincia, onListo }: { campo?: TCampo; espacioId: string; provincia: string; onListo: (nuevoId?: string) => void }) {
  const [nombre, setNombre] = useState(campo?.nombre ?? '');
  const [localidad, setLocalidad] = useState(campo?.localidad ?? '');
  const [error, setError] = useState<string | null>(null);
  return (
    <Formulario
      error={error}
      onGuardar={async () => {
        if (!nombre.trim()) return setError('Poné un nombre para el campo.');
        if (campo) { await db.campos.update(campo.id, { nombre: nombre.trim(), localidad: localidad.trim() || undefined }); onListo(); }
        else {
          const id = nuevoId();
          await db.campos.add({ id, espacioId, nombre: nombre.trim(), localidad: localidad.trim() || undefined, provincia });
          onListo(id);
        }
      }}
      onBorrar={campo ? async () => {
        if (confirm(`¿Borrar "${campo.nombre}" con todos sus lotes, cultivos y labores? No se puede deshacer.`)) { await borrarCampo(campo.id); onListo(); }
      } : undefined}
    >
      <Campo etiqueta="Nombre del campo">{(id) => <Entrada id={id} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="La Esperanza" autoFocus />}</Campo>
      <Campo etiqueta="Localidad (opcional)">{(id) => <Entrada id={id} value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Casilda" />}</Campo>
    </Formulario>
  );
}

export function FormLote({ lote, espacioId, campos, campoId, onListo, onBorrar }: {
  lote?: Lote; espacioId: string; campos: TCampo[]; campoId?: string; onListo: (id?: string) => void; onBorrar?: () => void;
}) {
  const [campo, setCampo] = useState(lote?.campoId ?? campoId ?? campos[0]?.id ?? '');
  const [nombre, setNombre] = useState(lote?.nombre ?? '');
  const [ha, setHa] = useState(lote ? String(lote.hectareas).replace('.', ',') : '');
  const [tenencia, setTenencia] = useState<Tenencia>(lote?.tenencia ?? 'propio');
  const [error, setError] = useState<string | null>(null);
  return (
    <Formulario
      error={error}
      onBorrar={onBorrar}
      onGuardar={async () => {
        const hectareas = leerNumero(ha);
        if (!nombre.trim()) return setError('Poné un nombre para el lote.');
        if (!(hectareas > 0)) return setError('Las hectáreas tienen que ser un número mayor a 0.');
        if (lote) { await db.lotes.update(lote.id, { campoId: campo, nombre: nombre.trim(), hectareas, tenencia }); onListo(lote.id); }
        else {
          const id = nuevoId();
          await db.lotes.add({ id, espacioId, campoId: campo, nombre: nombre.trim(), hectareas, tenencia });
          onListo(id);
        }
      }}
    >
      {campos.length > 1 && (
        <Campo etiqueta="Campo">{(id) => (
          <Selector id={id} value={campo} onChange={(e) => setCampo(e.target.value)}>
            {campos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Selector>
        )}</Campo>
      )}
      <Campo etiqueta="Nombre del lote">{(id) => <Entrada id={id} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Lote 4 - El bajo" autoFocus={!lote} />}</Campo>
      <Campo etiqueta="Superficie">{(id) => <EntradaNumero id={id} valor={ha} onCambio={setHa} sufijo="ha" placeholder="0" />}</Campo>
      <Campo etiqueta="Tenencia">{() => (
        <Opciones valor={tenencia} onCambio={setTenencia} opciones={[{ valor: 'propio', texto: 'Propio' }, { valor: 'alquilado', texto: 'Alquilado' }]} />
      )}</Campo>
    </Formulario>
  );
}
