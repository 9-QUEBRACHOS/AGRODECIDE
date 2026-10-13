import { useState } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ProveedorEstado, useEstado } from './estado';
import { Boton, cx, Hoja } from './componentes/ui';
import Bienvenida, { FormularioEspacio } from './pantallas/Bienvenida';
import Resultados from './pantallas/Resultados';
import Lotes from './pantallas/Lotes';
import LoteDetalle from './pantallas/LoteDetalle';
import CultivoDetalle from './pantallas/CultivoDetalle';
import Insumos from './pantallas/Insumos';
import Ajustes from './pantallas/Ajustes';

export default function App() {
  return (
    <ProveedorEstado>
      <HashRouter>
        <Marco />
      </HashRouter>
    </ProveedorEstado>
  );
}

function Marco() {
  const { cargando, espacio } = useEstado();
  if (cargando) return <div className="grid min-h-dvh place-items-center text-campo-700">Cargando…</div>;
  if (!espacio) return <Bienvenida />;
  return (
    <div className="min-h-dvh">
      <Encabezado />
      <main>
        <Routes>
          <Route path="/" element={<Resultados />} />
          <Route path="/lotes" element={<Lotes />} />
          <Route path="/lotes/:id" element={<LoteDetalle />} />
          <Route path="/cultivos/:id" element={<CultivoDetalle />} />
          <Route path="/insumos" element={<Insumos />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Navegacion />
    </div>
  );
}

function Encabezado() {
  const { espacio, espacios, campania, campanias, elegirEspacio, elegirCampania } = useEstado();
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const navegar = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-campo-800 text-white shadow-md">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
        <button onClick={() => setAbierto(true)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <img src="./icono-192.png" alt="" className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-white/20" />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-trigo">AgroDecide</span>
            <span className="flex items-center gap-1 truncate text-[15px] font-semibold leading-tight">
              <span className="truncate">{espacio?.nombre}</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-70" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </span>
        </button>
        {campanias.length > 0 && (
          <label className="relative shrink-0">
            <span className="sr-only">Campaña</span>
            <select
              value={campania?.id}
              onChange={(e) => elegirCampania(e.target.value)}
              className="h-9 appearance-none rounded-full bg-white/10 pl-3 pr-7 text-sm font-semibold text-white ring-1 ring-white/20 outline-none"
            >
              {campanias.map((c) => <option key={c.id} value={c.id} className="text-stone-900">{c.nombre}</option>)}
            </select>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M6 9l6 6 6-6" /></svg>
          </label>
        )}
      </div>

      <Hoja titulo={nuevo ? 'Nuevo espacio' : 'Tus espacios'} abierta={abierto} onCerrar={() => { setAbierto(false); setNuevo(false); }}>
        {nuevo ? (
          <FormularioEspacio onListo={(id) => { elegirEspacio(id); setAbierto(false); setNuevo(false); navegar('/'); }} />
        ) : (
          <div className="space-y-3 text-stone-900">
            <p className="text-sm text-stone-600">
              Cada espacio es una explotación independiente. Si sos asesor, creá uno por cliente.
            </p>
            <div className="divide-y divide-stone-200 rounded-2xl bg-white">
              {espacios.map((e) => (
                <button key={e.id} onClick={() => { elegirEspacio(e.id); setAbierto(false); navegar('/'); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={cx('h-3 w-3 shrink-0 rounded-full', e.id === espacio?.id ? 'bg-campo-600' : 'bg-stone-200')} />
                  <span className="flex-1 font-semibold">{e.nombre}</span>
                  <span className="text-xs text-stone-500">{e.esPropio ? 'Propio' : 'Cliente'}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Boton variante="secundario" className="flex-1" onClick={() => setNuevo(true)}>+ Nuevo espacio</Boton>
              <Boton variante="fantasma" onClick={() => { setAbierto(false); navegar('/ajustes'); }}>Ajustes</Boton>
            </div>
          </div>
        )}
      </Hoja>
    </header>
  );
}

const ITEMS = [
  { to: '/', texto: 'Resultados', icono: 'M4 19V5M4 19h16M8 15l3-4 3 2 4-6' },
  { to: '/lotes', texto: 'Lotes', icono: 'M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13' },
  { to: '/insumos', texto: 'Insumos', icono: 'M5 8h14l-1.5 11a2 2 0 01-2 1.7h-7a2 2 0 01-2-1.7zM9 8V6a3 3 0 016 0v2' },
  { to: '/ajustes', texto: 'Ajustes', icono: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z' },
];

function Navegacion() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {ITEMS.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === '/'}
            className={({ isActive }) => cx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold',
              isActive ? 'text-campo-800' : 'text-stone-500')}>
            {({ isActive }) => (
              <>
                <span className={cx('grid h-7 w-12 place-items-center rounded-full', isActive && 'bg-campo-100')}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={i.icono} /></svg>
                </span>
                {i.texto}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
