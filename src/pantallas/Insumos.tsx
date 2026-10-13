import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nuevoId } from '../db/baseDatos';
import { usosDeInsumo } from '../db/operaciones';
import { useEspacio } from '../estado';
import { CATEGORIAS_INSUMO, UNIDADES_INSUMO } from '../modelo/etiquetas';
import type { CategoriaInsumo, Insumo, UnidadInsumo } from '../modelo/tipos';
import { aUsd } from '../calculos/moneda';
import { BotonAgregar, Boton, Campo, Entrada, EntradaImporte, formDeImporte, Formulario, Hoja, importeDeForm, Pantalla, Selector, Tarjeta, TituloSeccion, Vacio } from '../componentes/ui';
import { numero } from '../utilidades/formato';

export default function Insumos() {
  const { espacio } = useEspacio();
  const insumos = useLiveQuery(() => db.insumos.where('espacioId').equals(espacio.id).sortBy('nombre'), [espacio.id]);
  const [edit, setEdit] = useState<Insumo | 'nuevo' | null>(null);
  if (!insumos) return null;

  const categorias = (Object.keys(CATEGORIAS_INSUMO) as CategoriaInsumo[]).filter((c) => insumos.some((i) => i.categoria === c));

  return (
    <Pantalla titulo="Insumos" subtitulo="Tu catálogo. El precio se precarga al aplicarlo en una labor."
      acciones={insumos.length > 0 && <BotonAgregar onClick={() => setEdit('nuevo')}>Insumo</BotonAgregar>}>
      {insumos.length === 0 && (
        <Vacio titulo="Todavía no cargaste insumos" texto="También los podés crear en el momento, mientras cargás una labor."
          accion={<Boton onClick={() => setEdit('nuevo')}>Agregar insumo</Boton>} />
      )}
      {categorias.map((c) => (
        <div key={c} className="space-y-2">
          <TituloSeccion>{CATEGORIAS_INSUMO[c]}</TituloSeccion>
          <Tarjeta className="divide-y divide-stone-100 py-1">
            {insumos.filter((i) => i.categoria === c).map((i) => (
              <button key={i.id} onClick={() => setEdit(i)} className="flex w-full items-baseline justify-between gap-3 py-3 text-left">
                <span className="font-semibold text-campo-900">{i.nombre}</span>
                <span className="num shrink-0 text-sm text-stone-600">
                  {i.precioReferencia
                    ? `${i.precioReferencia.moneda === 'ARS' ? '$' : 'US$'} ${numero(i.precioReferencia.monto, 2)} / ${UNIDADES_INSUMO[i.unidad]}`
                    : `por ${UNIDADES_INSUMO[i.unidad]}`}
                </span>
              </button>
            ))}
          </Tarjeta>
        </div>
      ))}
      <Hoja titulo={edit === 'nuevo' ? 'Nuevo insumo' : 'Editar insumo'} abierta={edit !== null} onCerrar={() => setEdit(null)}>
        {edit !== null && <FormInsumo insumo={edit === 'nuevo' ? undefined : edit} espacioId={espacio.id} onListo={() => setEdit(null)} />}
      </Hoja>
    </Pantalla>
  );
}

function FormInsumo({ insumo, espacioId, onListo }: { insumo?: Insumo; espacioId: string; onListo: () => void }) {
  const { tipoCambio } = useEspacio();
  const [nombre, setNombre] = useState(insumo?.nombre ?? '');
  const [categoria, setCategoria] = useState<CategoriaInsumo>(insumo?.categoria ?? 'herbicida');
  const [unidad, setUnidad] = useState<UnidadInsumo>(insumo?.unidad ?? 'l');
  const [precio, setPrecio] = useState(formDeImporte(insumo?.precioReferencia, tipoCambio));
  const [error, setError] = useState<string | null>(null);
  return (
    <Formulario
      error={error}
      onBorrar={insumo ? async () => {
        const usos = await usosDeInsumo(insumo.id);
        if (usos > 0) return setError(`No se puede borrar: está usado en ${usos} ${usos === 1 ? 'labor' : 'labores'}. Quitalo de esas labores primero.`);
        if (confirm(`¿Borrar "${insumo.nombre}" del catálogo?`)) { await db.insumos.delete(insumo.id); onListo(); }
      } : undefined}
      onGuardar={async () => {
        try {
          if (!nombre.trim()) return setError('Poné un nombre.');
          const p = importeDeForm(precio, 'precio');
          const datos = { espacioId, nombre: nombre.trim(), categoria, unidad, precioReferencia: p && p.monto > 0 ? p : undefined };
          if (insumo) await db.insumos.put({ ...datos, id: insumo.id });
          else await db.insumos.add({ ...datos, id: nuevoId() });
          onListo();
        } catch (e) { setError((e as Error).message); }
      }}
    >
      <Campo etiqueta="Nombre">{(id) => <Entrada id={id} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Glifosato 66%, Urea, Semilla DM 46i20…" autoFocus={!insumo} />}</Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Categoría">{(id) => (
          <Selector id={id} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaInsumo)}>
            {Object.entries(CATEGORIAS_INSUMO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Selector>
        )}</Campo>
        <Campo etiqueta="Se compra por">{(id) => (
          <Selector id={id} value={unidad} onChange={(e) => setUnidad(e.target.value as UnidadInsumo)}>
            {Object.entries(UNIDADES_INSUMO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Selector>
        )}</Campo>
      </div>
      <Campo etiqueta={`Precio de referencia por ${UNIDADES_INSUMO[unidad]} (opcional)`}
        ayuda={insumo?.precioReferencia ? `Equivale a US$ ${numero(aUsd(insumo.precioReferencia), 2)}. Se actualiza solo con el último precio que cargues en una labor.` : 'Se actualiza solo con el último precio que cargues en una labor.'}>
        {(id) => <EntradaImporte id={id} valor={precio} onCambio={setPrecio} sufijo={`/${UNIDADES_INSUMO[unidad]}`} />}
      </Campo>
    </Formulario>
  );
}
