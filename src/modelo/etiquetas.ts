// Textos que se muestran en la interfaz para cada valor del modelo.
import type {
  CategoriaInsumo, CondicionFiscal, ModalidadAlquiler, TipoCultivo, TipoLabor, UnidadInsumo,
} from './tipos';

export const CULTIVOS: Record<TipoCultivo, string> = {
  soja: 'Soja', maiz: 'Maíz', trigo: 'Trigo', girasol: 'Girasol', sorgo: 'Sorgo',
  cebada: 'Cebada', pastura: 'Pastura', verdeo: 'Verdeo', otro: 'Otro',
};

export const LABORES: Record<TipoLabor, string> = {
  siembra: 'Siembra', pulverizacion: 'Pulverización', fertilizacion: 'Fertilización',
  cosecha: 'Cosecha', labranza: 'Labranza', enrollado: 'Enrollado', picado: 'Picado',
  flete: 'Flete', otra: 'Otra',
};

export const CATEGORIAS_INSUMO: Record<CategoriaInsumo, string> = {
  semilla: 'Semilla', fertilizante: 'Fertilizante', herbicida: 'Herbicida',
  insecticida: 'Insecticida', fungicida: 'Fungicida', combustible: 'Combustible', otro: 'Otro',
};

export const UNIDADES_INSUMO: Record<UnidadInsumo, string> = {
  kg: 'kg', l: 'litro', bolsa: 'bolsa', unidad: 'unidad',
};

export const MODALIDADES_ALQUILER: Record<ModalidadAlquiler, string> = {
  qq_soja_ha: 'Quintales de soja por ha',
  monto_ha: 'Monto fijo por ha',
  porcentaje_cosecha: '% de la cosecha',
};

export const CONDICIONES_FISCALES: Record<CondicionFiscal, string> = {
  responsable_inscripto: 'Responsable inscripto', monotributo: 'Monotributo', otro: 'Otro',
};

export const PROVINCIAS = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos',
  'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
  'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];
