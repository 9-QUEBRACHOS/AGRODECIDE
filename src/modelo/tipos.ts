// Tipos del dominio de AgroDecide (ver ESPECIFICACION.md, sección 5)

export type Moneda = 'ARS' | 'USD';

export interface Importe {
  monto: number; // en la moneda original
  moneda: Moneda;
  tipoCambio: number; // ARS por USD en la fecha del movimiento
}

// ---------- Nivel superior ----------
export type CondicionFiscal = 'responsable_inscripto' | 'monotributo' | 'otro';
export type UnidadGrano = 'qq' | 'tn';

export interface Espacio {
  id: string;
  nombre: string;
  esPropio: boolean;
  provincia: string;
  condicionFiscal: CondicionFiscal;
  monedaReporte: Moneda;
  unidadGrano: UnidadGrano;
  creadoEn: string;
}

export interface Campania {
  id: string;
  espacioId: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

// ---------- Tierra ----------
export interface Campo {
  id: string;
  espacioId: string;
  nombre: string;
  localidad?: string;
  provincia?: string;
}

export type Tenencia = 'propio' | 'alquilado';

export interface Lote {
  id: string;
  espacioId: string;
  campoId: string;
  nombre: string;
  hectareas: number;
  tenencia: Tenencia;
}

export type ModalidadAlquiler = 'qq_soja_ha' | 'monto_ha' | 'porcentaje_cosecha';

export interface AlquilerLote {
  id: string;
  espacioId: string;
  loteId: string;
  campaniaId: string;
  tipo: 'contrato' | 'referencia';
  modalidad: ModalidadAlquiler;
  valor: number;
  importePorHa?: Importe;
  precioSojaReferencia?: Importe;
  notas?: string;
}

// ---------- Producción ----------
export type TipoCultivo =
  | 'soja' | 'maiz' | 'trigo' | 'girasol' | 'sorgo' | 'cebada'
  | 'pastura' | 'verdeo' | 'otro';

export interface CultivoEnLote {
  id: string;
  espacioId: string;
  loteId: string;
  campaniaId: string;
  cultivo: TipoCultivo;
  nombreCultivo?: string;
  ciclo: 'primera' | 'segunda';
  hectareas: number;
  porcentajeAlquiler: number;
  fechaSiembra?: string;
  rindeEstimadoKgHa?: number;
  precioEstimado?: Importe; // por tn
}

export type CategoriaInsumo =
  | 'semilla' | 'fertilizante' | 'herbicida' | 'insecticida'
  | 'fungicida' | 'combustible' | 'otro';
export type UnidadInsumo = 'kg' | 'l' | 'bolsa' | 'unidad';

export interface Insumo {
  id: string;
  espacioId: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: UnidadInsumo;
  precioReferencia?: Importe;
}

export type TipoLabor =
  | 'siembra' | 'pulverizacion' | 'fertilizacion' | 'cosecha'
  | 'labranza' | 'enrollado' | 'picado' | 'flete' | 'otra';

export interface Labor {
  id: string;
  espacioId: string;
  cultivoEnLoteId: string;
  tipo: TipoLabor;
  fecha: string;
  hectareas: number;
  modalidad: 'contratada' | 'propia';
  costoPorHa?: Importe;
  notas?: string;
}

export interface InsumoAplicado {
  id: string;
  espacioId: string;
  laborId: string;
  insumoId: string;
  dosisPorHa: number;
  precioUnitario: Importe;
}

export type CategoriaGasto =
  | 'administracion' | 'seguros' | 'personal' | 'vehiculos'
  | 'impuestos_fijos' | 'mantenimiento' | 'otro';

export interface GastoEstructura {
  id: string;
  espacioId: string;
  campaniaId: string;
  concepto: string;
  categoria: CategoriaGasto;
  fecha: string;
  importe: Importe;
}

// ---------- Cosecha y destinos ----------
export interface Cosecha {
  id: string;
  espacioId: string;
  cultivoEnLoteId: string;
  fecha: string;
  kg: number;
}

export interface GastoComercial {
  concepto: string;
  importe: Importe;
}

export interface Venta {
  id: string;
  espacioId: string;
  cultivoEnLoteId: string;
  fecha: string;
  kg: number;
  precioPorTn: Importe;
  comprador?: string;
  gastosComerciales: GastoComercial[];
}

export interface MovimientoStock {
  id: string;
  espacioId: string;
  cultivoEnLoteId: string;
  fecha: string;
  kg: number;
  ubicacion?: string;
}

// ---------- Ganadería (fase 2) ----------
export interface Reserva {
  id: string;
  espacioId: string;
  tipo: 'rollo' | 'silo' | 'grano' | 'otro';
  origenCultivoEnLoteId: string;
  fecha: string;
  kgOrigen: number;
  cantidad: number;
  unidad: 'rollo' | 'kg' | 'tn';
  kgPorUnidad?: number;
  laborIds: string[];
  precioMercadoReferencia?: Importe;
}

export interface Rodeo {
  id: string;
  espacioId: string;
  nombre: string;
  cabezas?: number;
}

export interface Suministro {
  id: string;
  espacioId: string;
  rodeoId: string;
  reservaId: string;
  fecha: string;
  cantidad: number;
}

// ---------- Impuestos (fase 3) ----------
export interface ParametroImpositivo {
  id: string;
  espacioId: string;
  concepto: 'iibb' | 'retencion_ganancias' | 'retencion_iva' | 'derecho_exportacion' | 'otro';
  cultivo?: TipoCultivo;
  alicuota: number;
  vigenteDesde: string;
  nota?: string;
}
