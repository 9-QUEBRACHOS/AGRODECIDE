import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nuevoId } from '../db/baseDatos';
import { borrarCampania, borrarEspacio, exportarEspacio, importarEspacio } from '../db/operaciones';
import { cargarEjemplo } from '../db/ejemplo';
import { useEspacio } from '../estado';
import { CONDICIONES_FISCALES, PROVINCIAS } from '../modelo/etiquetas';
import type { Campania, CondicionFiscal, Espacio } from '../modelo/tipos';
import { BotonesInforme } from '../componentes/Informes';
import { entregarArchivo } from '../utilidades/descargas';
import { BotonAgregar, Boton, Campo, Dato, Entrada, EntradaNumero, Formulario, Hoja, Opciones, Pantalla, Selector, Tarjeta, TituloSeccion } from '../componentes/ui';
import { campaniaSugerida, fecha, hoy, leerNumero, numero } from '../utilidades/formato';

export async function importarDesdeArchivo(archivo: File): Promise<string> {
  let contenido: unknown;
  try { contenido = JSON.parse(await archivo.text()); } catch { throw new Error('El archivo no se pudo leer. ¿Es un respaldo de AgroDecide (.json)?'); }
  return importarEspacio(contenido);
}

export default function Ajustes() {
  const { espacio, campania, elegirEspacio, elegirCampania, tipoCambio, setTipoCambio } = useEspacio();
  const campanias = useLiveQuery(async () => (await db.campanias.where('espacioId').equals(espacio.id).toArray())
    .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)), [espacio.id]);
  const [editEspacio, setEditEspacio] = useState(false);
  const [editCampania, setEditCampania] = useState<Campania | 'nueva' | null>(null);
  const [tc, setTc] = useState(String(tipoCambio));
  const [mensaje, setMensaje] = useState<string | null>(null);
  const persistente = useLiveQuery(async () => (navigator.storage?.persisted ? navigator.storage.persisted() : true), []);

  return (
    <Pantalla titulo="Ajustes">
      <TituloSeccion>Este espacio</TituloSeccion>
      <Tarjeta>
        <Dato etiqueta="Nombre" valor={espacio.nombre} />
        <Dato etiqueta="Tipo" valor={espacio.esPropio ? 'Mi explotación' : 'Cliente'} />
        <Dato etiqueta="Provincia" valor={espacio.provincia} />
        <Dato etiqueta="Condición fiscal" valor={CONDICIONES_FISCALES[espacio.condicionFiscal]} />
        <Boton variante="secundario" className="mt-3 w-full" onClick={() => setEditEspacio(true)}>Editar espacio</Boton>
      </Tarjeta>

      <TituloSeccion accion={<BotonAgregar onClick={() => setEditCampania('nueva')}>Campaña</BotonAgregar>}>Campañas</TituloSeccion>
      <Tarjeta className="divide-y divide-stone-100 py-1">
        {(campanias ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-3">
            <button className="min-w-0 text-left" onClick={() => elegirCampania(c.id)}>
              <div className="font-semibold text-campo-900">
                {c.nombre} {c.id === campania?.id && <span className="ml-1 text-xs font-bold text-campo-600">● ACTIVA</span>}
              </div>
              <div className="text-sm text-stone-600">{fecha(c.fechaInicio)} al {fecha(c.fechaFin)}</div>
            </button>
            <Boton chico variante="fantasma" onClick={() => setEditCampania(c)}>Editar</Boton>
          </div>
        ))}
        {campanias?.length === 0 && <p className="py-3 text-sm text-stone-500">Sin campañas.</p>}
      </Tarjeta>

      <TituloSeccion>Dólar para ver en pesos</TituloSeccion>
      <Tarjeta className="space-y-3">
        <p className="text-sm text-stone-600">
          Cada gasto y venta guarda su propio dólar del día. Este valor solo se usa para mostrar los totales en pesos,
          y se actualiza solo con el último que cargues.
        </p>
        <div className="flex gap-2">
          <EntradaNumero valor={tc} onCambio={setTc} sufijo="$/US$" aria-label="Tipo de cambio" />
          <Boton variante="secundario" onClick={() => { const v = leerNumero(tc); if (v > 0) { setTipoCambio(v); setMensaje(`Dólar actualizado a $ ${numero(v)}.`); } }}>Guardar</Boton>
        </div>
      </Tarjeta>

      <TituloSeccion>Informes de la campaña {campania?.nombre}</TituloSeccion>
      <Tarjeta className="space-y-3">
        <p className="text-sm text-stone-600">
          Un informe prolijo para leer, imprimir o mandar: resultado por cultivo, alquileres, labores e insumos, cosechas y ventas.
        </p>
        <BotonesInforme />
      </Tarjeta>

      <TituloSeccion>Respaldo de datos (para la app)</TituloSeccion>
      <Tarjeta className="space-y-3">
        <p className="text-sm text-stone-600">
          Tus datos están solo en este dispositivo. El respaldo es un archivo para volver a cargar en AgroDecide (en otro celular,
          o para pasárselo a tu asesor). No es para leerlo: para eso usá los informes de arriba.
        </p>
        {persistente === false && (
          <p className="rounded-xl bg-trigo/20 px-3 py-2 text-sm">
            Este navegador podría borrar los datos si pasa mucho tiempo sin usar la app o se queda sin espacio.
            Instalala en la pantalla de inicio y exportá un respaldo seguido.
          </p>
        )}
        <Boton className="w-full" onClick={async () => {
          const archivo = await exportarEspacio(espacio.id);
          const nombre = `agrodecide-${espacio.nombre.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${hoy()}.json`;
          await entregarArchivo(nombre, new Blob([JSON.stringify(archivo)], { type: 'application/json' }), 'Respaldo de AgroDecide');
          setMensaje('Respaldo descargado. Guardalo en un lugar seguro (Drive, mail, pendrive).');
        }}>Guardar respaldo</Boton>
        <label className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-white font-semibold text-campo-800 ring-1 ring-inset ring-campo-800/25 hover:bg-campo-50">
          Cargar un respaldo
          <input type="file" accept=".json,application/json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try { const id = await importarDesdeArchivo(f); elegirEspacio(id); setMensaje('Respaldo importado como un espacio nuevo.'); }
            catch (err) { setMensaje((err as Error).message); }
          }} />
        </label>
      </Tarjeta>
      {mensaje && <p className="rounded-xl bg-campo-100 px-3 py-2 text-sm font-medium text-campo-900" role="status">{mensaje}</p>}

      <TituloSeccion>Probar la app</TituloSeccion>
      <Tarjeta className="space-y-3">
        <p className="text-sm text-stone-600">Crea un espacio aparte con un campo mixto de ejemplo (valores ilustrativos) para ver cómo funciona.</p>
        <Boton variante="secundario" className="w-full" onClick={async () => { const r = await cargarEjemplo(); elegirEspacio(r.espacioId); elegirCampania(r.campaniaId); setMensaje('Listo: estás viendo el campo de ejemplo. Volvé a tu espacio desde el nombre de arriba.'); }}>Cargar campo de ejemplo</Boton>
      </Tarjeta>

      <p className="pt-4 text-center text-xs text-stone-500">
        AgroDecide · gratis y de código abierto · los cálculos son orientativos.
      </p>

      <Hoja titulo="Editar espacio" abierta={editEspacio} onCerrar={() => setEditEspacio(false)}>
        <FormEspacio espacio={espacio} onListo={() => setEditEspacio(false)}
          onBorrar={async () => {
            if (confirm(`¿Borrar el espacio "${espacio.nombre}" con TODOS sus datos? No se puede deshacer. Si no tenés un respaldo, exportalo antes.`)) {
              await borrarEspacio(espacio.id); elegirEspacio(null); setEditEspacio(false);
            }
          }} />
      </Hoja>
      <Hoja titulo={editCampania === 'nueva' ? 'Nueva campaña' : 'Editar campaña'} abierta={editCampania !== null} onCerrar={() => setEditCampania(null)}>
        {editCampania !== null && (
          <FormCampania espacioId={espacio.id} campania={editCampania === 'nueva' ? undefined : editCampania} existentes={campanias ?? []}
            onListo={(id) => { setEditCampania(null); if (id) elegirCampania(id); }}
            onBorrar={editCampania !== 'nueva' ? async () => {
              if (confirm(`¿Borrar la campaña ${editCampania.nombre} con todos sus cultivos, labores, cosechas y ventas? No se puede deshacer.`)) {
                await borrarCampania(editCampania.id); setEditCampania(null);
              }
            } : undefined} />
        )}
      </Hoja>
    </Pantalla>
  );
}

function FormEspacio({ espacio, onListo, onBorrar }: { espacio: Espacio; onListo: () => void; onBorrar: () => void }) {
  const [nombre, setNombre] = useState(espacio.nombre);
  const [provincia, setProvincia] = useState(espacio.provincia);
  const [condicion, setCondicion] = useState<CondicionFiscal>(espacio.condicionFiscal);
  const [uso, setUso] = useState<'propio' | 'cliente'>(espacio.esPropio ? 'propio' : 'cliente');
  const [error, setError] = useState<string | null>(null);
  return (
    <Formulario error={error} onBorrar={onBorrar} onGuardar={async () => {
      if (!nombre.trim()) return setError('Poné un nombre.');
      await db.espacios.update(espacio.id, { nombre: nombre.trim(), provincia, condicionFiscal: condicion, esPropio: uso === 'propio' });
      onListo();
    }}>
      <Campo etiqueta="¿De quién es?">{() => <Opciones valor={uso} onCambio={setUso} opciones={[{ valor: 'propio', texto: 'Mi explotación' }, { valor: 'cliente', texto: 'Un cliente' }]} />}</Campo>
      <Campo etiqueta="Nombre">{(id) => <Entrada id={id} value={nombre} onChange={(e) => setNombre(e.target.value)} />}</Campo>
      <Campo etiqueta="Provincia">{(id) => (
        <Selector id={id} value={provincia} onChange={(e) => setProvincia(e.target.value)}>{PROVINCIAS.map((p) => <option key={p}>{p}</option>)}</Selector>
      )}</Campo>
      <Campo etiqueta="Condición fiscal" ayuda="Se va a usar para estimar impuestos en una próxima versión.">{(id) => (
        <Selector id={id} value={condicion} onChange={(e) => setCondicion(e.target.value as CondicionFiscal)}>
          {Object.entries(CONDICIONES_FISCALES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Selector>
      )}</Campo>
    </Formulario>
  );
}

function FormCampania({ espacioId, campania, existentes, onListo, onBorrar }: {
  espacioId: string; campania?: Campania; existentes: Campania[]; onListo: (id?: string) => void; onBorrar?: () => void;
}) {
  const sugerida = (() => {
    if (campania) return campania;
    const s = campaniaSugerida();
    if (!existentes.some((e) => e.nombre === s.nombre)) return s;
    // si ya existe, sugerir la siguiente a la más nueva
    const a = Number(existentes[0]?.fechaInicio.slice(0, 4)) + 1 || new Date().getFullYear();
    return { nombre: `${a}/${String((a + 1) % 100).padStart(2, '0')}`, fechaInicio: `${a}-07-01`, fechaFin: `${a + 1}-06-30` };
  })();
  const [nombre, setNombre] = useState(sugerida.nombre);
  const [inicio, setInicio] = useState(sugerida.fechaInicio);
  const [fin, setFin] = useState(sugerida.fechaFin);
  const [error, setError] = useState<string | null>(null);
  return (
    <Formulario error={error} onBorrar={onBorrar} onGuardar={async () => {
      if (!nombre.trim()) return setError('Poné un nombre (ej. 2026/27).');
      if (!inicio || !fin || fin < inicio) return setError('Revisá las fechas: el fin tiene que ser posterior al inicio.');
      if (campania) { await db.campanias.update(campania.id, { nombre: nombre.trim(), fechaInicio: inicio, fechaFin: fin }); onListo(); }
      else { const id = nuevoId(); await db.campanias.add({ id, espacioId, nombre: nombre.trim(), fechaInicio: inicio, fechaFin: fin }); onListo(id); }
    }}>
      <Campo etiqueta="Nombre">{(id) => <Entrada id={id} value={nombre} onChange={(e) => setNombre(e.target.value)} />}</Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Desde">{(id) => <Entrada id={id} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />}</Campo>
        <Campo etiqueta="Hasta">{(id) => <Entrada id={id} type="date" value={fin} onChange={(e) => setFin(e.target.value)} />}</Campo>
      </div>
    </Formulario>
  );
}
