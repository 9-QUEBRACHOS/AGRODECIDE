import Dexie, { type EntityTable } from 'dexie';
import type {
  AlquilerLote, Campania, Campo, Cosecha, CultivoEnLote, Espacio, GastoEstructura, Insumo,
  InsumoAplicado, Labor, Lote, MovimientoStock, ParametroImpositivo, Reserva, Rodeo,
  Suministro, Venta,
} from '../modelo/tipos';

/**
 * Base de datos local (IndexedDB) de AgroDecide.
 * Regla: si cambia el esquema, se agrega un nuevo `this.version(n)` con la migración.
 * Nunca se borran datos del usuario.
 */
export class BaseAgroDecide extends Dexie {
  espacios!: EntityTable<Espacio, 'id'>;
  campanias!: EntityTable<Campania, 'id'>;
  campos!: EntityTable<Campo, 'id'>;
  lotes!: EntityTable<Lote, 'id'>;
  alquileres!: EntityTable<AlquilerLote, 'id'>;
  cultivos!: EntityTable<CultivoEnLote, 'id'>;
  insumos!: EntityTable<Insumo, 'id'>;
  labores!: EntityTable<Labor, 'id'>;
  insumosAplicados!: EntityTable<InsumoAplicado, 'id'>;
  gastosEstructura!: EntityTable<GastoEstructura, 'id'>;
  cosechas!: EntityTable<Cosecha, 'id'>;
  ventas!: EntityTable<Venta, 'id'>;
  movimientosStock!: EntityTable<MovimientoStock, 'id'>;
  reservas!: EntityTable<Reserva, 'id'>;
  rodeos!: EntityTable<Rodeo, 'id'>;
  suministros!: EntityTable<Suministro, 'id'>;
  parametrosImpositivos!: EntityTable<ParametroImpositivo, 'id'>;

  constructor(nombre = 'agrodecide') {
    super(nombre);
    this.version(1).stores({
      espacios: 'id, nombre',
      campanias: 'id, espacioId',
      campos: 'id, espacioId',
      lotes: 'id, espacioId, campoId',
      alquileres: 'id, espacioId, loteId, campaniaId, [loteId+campaniaId]',
      cultivos: 'id, espacioId, loteId, campaniaId',
      insumos: 'id, espacioId',
      labores: 'id, espacioId, cultivoEnLoteId',
      insumosAplicados: 'id, espacioId, laborId',
      gastosEstructura: 'id, espacioId, campaniaId',
      cosechas: 'id, espacioId, cultivoEnLoteId',
      ventas: 'id, espacioId, cultivoEnLoteId',
      movimientosStock: 'id, espacioId, cultivoEnLoteId',
      reservas: 'id, espacioId, origenCultivoEnLoteId',
      rodeos: 'id, espacioId',
      suministros: 'id, espacioId, rodeoId, reservaId',
      parametrosImpositivos: 'id, espacioId',
    });
  }
}

export const db = new BaseAgroDecide();

/** Tablas que pertenecen a un espacio (todas menos `espacios`). */
export const TABLAS_DEL_ESPACIO = [
  'campanias', 'campos', 'lotes', 'alquileres', 'cultivos', 'insumos', 'labores',
  'insumosAplicados', 'gastosEstructura', 'cosechas', 'ventas', 'movimientosStock',
  'reservas', 'rodeos', 'suministros', 'parametrosImpositivos',
] as const;

export type TablaDelEspacio = (typeof TABLAS_DEL_ESPACIO)[number];

export const nuevoId = () => crypto.randomUUID();
