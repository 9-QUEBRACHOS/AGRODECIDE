import { useState } from 'react';
import { db, nuevoId } from '../db/baseDatos';
import { cargarEjemplo } from '../db/ejemplo';
import { useEstado } from '../estado';
import { Boton, Campo, Entrada, Formulario, Opciones, Selector } from '../componentes/ui';
import { PROVINCIAS } from '../modelo/etiquetas';
import { campaniaSugerida, hoy } from '../utilidades/formato';
import { importarDesdeArchivo } from './Ajustes';

/** Crea un espacio con su campaña actual. Devuelve el id. */
export async function crearEspacio(nombre: string, provincia: string, esPropio: boolean) {
  const id = nuevoId();
  await db.transaction('rw', db.espacios, db.campanias, async () => {
    await db.espacios.add({
      id, nombre, esPropio, provincia, condicionFiscal: 'responsable_inscripto',
      monedaReporte: 'USD', unidadGrano: 'qq', creadoEn: hoy(),
    });
    await db.campanias.add({ id: nuevoId(), espacioId: id, ...campaniaSugerida() });
  });
  return id;
}

export function FormularioEspacio({ onListo }: { onListo: (id: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [provincia, setProvincia] = useState('Santa Fe');
  const [uso, setUso] = useState<'propio' | 'cliente'>('propio');
  const [error, setError] = useState<string | null>(null);
  return (
    <Formulario
      textoGuardar="Crear"
      error={error}
      onGuardar={async () => {
        if (!nombre.trim()) return setError('Poné un nombre (por ejemplo, el del campo o el del cliente).');
        onListo(await crearEspacio(nombre.trim(), provincia, uso === 'propio'));
      }}
    >
      <Campo etiqueta="¿De quién es?">
        {() => <Opciones valor={uso} onCambio={setUso} opciones={[{ valor: 'propio', texto: 'Mi explotación' }, { valor: 'cliente', texto: 'Un cliente' }]} />}
      </Campo>
      <Campo etiqueta="Nombre" ayuda={uso === 'propio' ? 'Ej.: "La Esperanza" o tu apellido.' : 'Ej.: "Juan Pérez — Casilda".'}>
        {(id) => <Entrada id={id} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />}
      </Campo>
      <Campo etiqueta="Provincia">
        {(id) => (
          <Selector id={id} value={provincia} onChange={(e) => setProvincia(e.target.value)}>
            {PROVINCIAS.map((p) => <option key={p}>{p}</option>)}
          </Selector>
        )}
      </Campo>
    </Formulario>
  );
}

export default function Bienvenida() {
  const { elegirEspacio, elegirCampania } = useEstado();
  const [paso, setPaso] = useState<'inicio' | 'crear'>('inicio');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-dvh bg-campo-800 text-white">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
        <div className="flex items-center gap-3">
          <img src="./icono-192.png" alt="" className="h-12 w-12 rounded-xl ring-1 ring-white/20" />
          <div>
            <div className="text-2xl font-extrabold tracking-tight">AgroDecide</div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-trigo">Del dato a la decisión</div>
          </div>
        </div>

        {paso === 'inicio' ? (
          <>
            <h1 className="mt-12 text-[2.1rem] font-extrabold leading-[1.1] tracking-tight">
              ¿Cuánto te cuesta producir cada hectárea?
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-white/80">
              Cargá labores, insumos, alquiler, cosecha y ventas. AgroDecide te muestra el costo por hectárea,
              el margen de cada lote y el rinde que necesitás para cubrir los costos.
            </p>
            <ul className="mt-6 space-y-2 text-[15px] text-white/85">
              <li className="flex gap-2"><span className="text-trigo">●</span> Gratis y sin crear cuentas.</li>
              <li className="flex gap-2"><span className="text-trigo">●</span> Tus datos quedan en tu dispositivo.</li>
              <li className="flex gap-2"><span className="text-trigo">●</span> Pesos y dólares, cada gasto con su dólar del día.</li>
            </ul>
            <div className="mt-auto space-y-3 pt-10">
              <Boton className="w-full bg-trigo! text-campo-900! hover:bg-trigo/90!" onClick={() => setPaso('crear')}>Empezar con mi campo</Boton>
              <Boton variante="fantasma" className="w-full text-white hover:bg-white/10"
                onClick={async () => { const r = await cargarEjemplo(); elegirEspacio(r.espacioId); elegirCampania(r.campaniaId); }}>
                Ver un campo de ejemplo
              </Boton>
              <label className="block cursor-pointer text-center text-sm text-white/70 underline-offset-4 hover:underline">
                Tengo un respaldo de AgroDecide
                <input type="file" accept=".json,application/json" className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try { elegirEspacio(await importarDesdeArchivo(f)); } catch (err) { setError((err as Error).message); }
                  }} />
              </label>
              {error && <p className="text-center text-sm text-trigo">{error}</p>}
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-3xl bg-crema p-5 text-stone-900">
            <h2 className="mb-4 text-xl font-extrabold text-campo-900">Tu primer espacio</h2>
            <FormularioEspacio onListo={elegirEspacio} />
            <button className="mt-3 w-full text-center text-sm text-stone-500" onClick={() => setPaso('inicio')}>Volver</button>
          </div>
        )}
      </div>
    </div>
  );
}
