// Componentes de interfaz reutilizables. Mobile-first, botones grandes.
import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Importe, Moneda } from '../modelo/tipos';
import { leerNumero } from '../utilidades/formato';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

// ---------- Estructura ----------
export function Pantalla({ titulo, subtitulo, volver, acciones, children }: {
  titulo: string; subtitulo?: string; volver?: string | boolean; acciones?: ReactNode; children: ReactNode;
}) {
  const navegar = useNavigate();
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
      <div className="mb-4 flex items-start gap-2">
        {volver && (
          <button
            onClick={() => (typeof volver === 'string' ? navegar(volver) : navegar(-1))}
            className="-ml-2 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-campo-800 hover:bg-campo-100"
            aria-label="Volver"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.6rem] font-extrabold leading-tight tracking-tight text-campo-900">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-sm text-stone-600">{subtitulo}</p>}
        </div>
        {acciones && <div className="flex shrink-0 gap-2">{acciones}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function Tarjeta({ children, className, ...p }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cx('rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}>{children}</div>;
}

export function TituloSeccion({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-campo-700">{children}</h2>
      {accion}
    </div>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white/60 px-5 py-8 text-center">
      <p className="font-semibold text-campo-900">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">{texto}</p>}
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}

export function FilaLink({ to, titulo, detalle, derecha }: { to: string; titulo: ReactNode; detalle?: ReactNode; derecha?: ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl px-1 py-3 active:bg-campo-50">
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-campo-900">{titulo}</div>
        {detalle && <div className="truncate text-sm text-stone-600">{detalle}</div>}
      </div>
      {derecha && <div className="shrink-0 text-right">{derecha}</div>}
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-stone-400" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

export function Dato({ etiqueta, valor, fuerte, tono }: { etiqueta: ReactNode; valor: ReactNode; fuerte?: boolean; tono?: 'pos' | 'neg' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className={cx('text-sm', fuerte ? 'font-semibold text-campo-900' : 'text-stone-600')}>{etiqueta}</span>
      <span className={cx('num text-right', fuerte ? 'font-bold' : 'font-medium',
        tono === 'pos' && 'text-campo-700', tono === 'neg' && 'text-tierra', !tono && 'text-stone-900')}>{valor}</span>
    </div>
  );
}

export function Etiqueta({ children, tono = 'neutro' }: { children: ReactNode; tono?: 'neutro' | 'proyectado' | 'real' | 'alerta' }) {
  const t = {
    neutro: 'bg-stone-100 text-stone-700',
    proyectado: 'bg-trigo/30 text-trigo-700',
    real: 'bg-campo-100 text-campo-800',
    alerta: 'bg-tierra/10 text-tierra',
  }[tono];
  return <span className={cx('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', t)}>{children}</span>;
}

// ---------- Botones ----------
type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';
export function Boton({ variante = 'primario', className, chico, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; chico?: boolean }) {
  const v = {
    primario: 'bg-campo-800 text-white hover:bg-campo-700 active:bg-campo-900',
    secundario: 'bg-white text-campo-800 ring-1 ring-inset ring-campo-800/25 hover:bg-campo-50',
    peligro: 'bg-white text-tierra ring-1 ring-inset ring-tierra/40 hover:bg-tierra/5',
    fantasma: 'text-campo-800 hover:bg-campo-100',
  }[variante];
  return (
    <button
      type="button"
      {...p}
      className={cx('inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:opacity-40',
        chico ? 'h-9 px-3 text-sm' : 'h-12 px-5', v, className)}
    />
  );
}

export function BotonAgregar({ children, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Boton chico variante="secundario" {...p}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
      {children}
    </Boton>
  );
}

// ---------- Formularios ----------
export function Campo({ etiqueta, ayuda, children, className }: { etiqueta: string; ayuda?: ReactNode; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-campo-900">{etiqueta}</label>
      {children(id)}
      {ayuda && <p className="mt-1 text-xs text-stone-500">{ayuda}</p>}
    </div>
  );
}

const claseEntrada = 'h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-campo-600 focus:ring-2 focus:ring-campo-600/20';

export function Entrada(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(claseEntrada, p.className)} />;
}

export function EntradaNumero({ valor, onCambio, sufijo, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { valor: string; onCambio: (v: string) => void; sufijo?: string }) {
  return (
    <div className="relative">
      <input
        {...p}
        inputMode="decimal"
        value={valor}
        onChange={(e) => onCambio(e.target.value.replace(/[^\d.,-]/g, ''))}
        className={cx(claseEntrada, 'num', sufijo && 'pr-16', p.className)}
      />
      {sufijo && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-stone-500">{sufijo}</span>}
    </div>
  );
}

export function Selector({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx(claseEntrada, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2357534e%27 stroke-width=%272%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E")] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10', p.className)}>
      {children}
    </select>
  );
}

export function Opciones<T extends string>({ valor, opciones, onCambio }: { valor: T; opciones: { valor: T; texto: string }[]; onCambio: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-stone-100 p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onCambio(o.valor)}
          className={cx('h-10 flex-1 rounded-lg px-2 text-sm font-semibold transition',
            valor === o.valor ? 'bg-white text-campo-900 shadow-sm' : 'text-stone-600')}
        >{o.texto}</button>
      ))}
    </div>
  );
}

// ---------- Importe (monto + moneda + tipo de cambio) ----------
export interface ImporteForm { monto: string; moneda: Moneda; tipoCambio: string }

export const importeVacio = (tc: number, moneda: Moneda = 'USD'): ImporteForm => ({ monto: '', moneda, tipoCambio: String(tc) });
export const formDeImporte = (i: Importe | undefined, tc: number, moneda: Moneda = 'USD'): ImporteForm =>
  i ? { monto: String(i.monto).replace('.', ','), moneda: i.moneda, tipoCambio: String(i.tipoCambio) } : importeVacio(tc, moneda);

/** Devuelve el Importe, o undefined si el monto está vacío. Lanza error si es inválido. */
export function importeDeForm(f: ImporteForm, nombre: string): Importe | undefined {
  const monto = leerNumero(f.monto);
  if (Number.isNaN(monto)) return undefined;
  const tipoCambio = leerNumero(f.tipoCambio);
  if (f.moneda === 'ARS' && !(tipoCambio > 0)) throw new Error(`Falta el tipo de cambio en "${nombre}".`);
  return { monto, moneda: f.moneda, tipoCambio: tipoCambio > 0 ? tipoCambio : 0 };
}

export function EntradaImporte({ id, valor, onCambio, sufijo, placeholder }: { id?: string; valor: ImporteForm; onCambio: (v: ImporteForm) => void; sufijo?: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <EntradaNumero id={id} valor={valor.monto} onCambio={(monto) => onCambio({ ...valor, monto })} sufijo={sufijo} placeholder={placeholder ?? '0'} />
        </div>
        <div className="flex rounded-xl bg-stone-100 p-1">
          {(['USD', 'ARS'] as const).map((m) => (
            <button key={m} type="button" aria-label={m === 'USD' ? 'Dólares' : 'Pesos'} aria-pressed={valor.moneda === m} onClick={() => onCambio({ ...valor, moneda: m })}
              className={cx('h-10 w-14 rounded-lg text-sm font-bold', valor.moneda === m ? 'bg-white text-campo-900 shadow-sm' : 'text-stone-500')}>
              {m === 'USD' ? 'US$' : '$'}
            </button>
          ))}
        </div>
      </div>
      {valor.moneda === 'ARS' && (
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <span className="shrink-0">Dólar del día: $</span>
          <EntradaNumero valor={valor.tipoCambio} onCambio={(tipoCambio) => onCambio({ ...valor, tipoCambio })} className="h-10" />
        </div>
      )}
    </div>
  );
}

// ---------- Hoja (panel que sube desde abajo) ----------
export function Hoja({ titulo, abierta, onCerrar, children }: { titulo: string; abierta: boolean; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [abierta, onCerrar]);
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-campo-900/40 backdrop-blur-[2px]" onClick={onCerrar} />
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-crema p-5 pb-8 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto -mt-2 mb-3 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" />
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-campo-900">{titulo}</h2>
          <button onClick={onCerrar} className="grid h-10 w-10 place-items-center rounded-full text-stone-500 hover:bg-stone-200" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Formulario estándar dentro de una Hoja: maneja errores y botones. */
export function Formulario({ onGuardar, onBorrar, textoGuardar = 'Guardar', error, children }: {
  onGuardar: () => void | Promise<void>; onBorrar?: () => void; textoGuardar?: string; error?: string | null; children: ReactNode;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); void onGuardar(); }}
    >
      {children}
      {error && <p className="rounded-xl bg-tierra/10 px-3 py-2 text-sm font-medium text-tierra">{error}</p>}
      <div className="flex gap-2 pt-1">
        {onBorrar && <Boton variante="peligro" onClick={onBorrar}>Borrar</Boton>}
        <Boton type="submit" className="flex-1">{textoGuardar}</Boton>
      </div>
    </form>
  );
}
