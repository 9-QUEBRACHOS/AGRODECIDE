# AgroDecide — Especificación del proyecto

> **Para el agente de código:** leé este archivo completo antes de cada tarea.
> Es la fuente de verdad del proyecto. No cambies el modelo de datos, las reglas de
> cálculo ni el stack sin que se te pida explícitamente. Si algo de una tarea
> contradice este documento, frená y preguntá.

---

## 1. Qué es AgroDecide

Aplicación web **gratuita y pública** para productores agropecuarios argentinos
(pequeños y medianos) que centraliza la información productiva y económica de su
explotación y la convierte en indicadores claros para decidir:

- ¿Cuánto me cuesta realmente producir una hectárea?
- ¿Qué lote o cultivo me deja más margen?
- ¿Me conviene vender el grano o transformarlo (rollos, silo, alimento para el rodeo)?
- ¿Cuánto me cuesta cada rollo o cada kg de alimento?
- ¿Con qué rinde cubro los costos (rinde de indiferencia)?

### Principios de diseño
1. **Carga con fricción mínima.** El usuario carga desde el celular, en el campo.
   Valores por defecto razonables, plantillas, se puede cargar aproximado y corregir después.
2. **Los datos son del productor.** Se guardan en su dispositivo. No hay servidor ni cuentas.
3. **Funciona sin señal.** Es una PWA instalable y offline.
4. **Números honestos.** Todo cálculo muestra de dónde sale. Los impuestos son
   *estimaciones* con alícuotas editables, nunca un cálculo contable.
5. **Simple primero.** Cada fase tiene que funcionar completa antes de pasar a la siguiente.

---

## 2. Usuarios y "Espacios"

- **Productor:** usa un solo Espacio (su explotación). No necesita saber que existen los espacios.
- **Asesor (ej. ingeniero agrónomo):** crea un Espacio por cliente y cambia entre ellos
  con un selector (como cambiar de cuenta en Gmail).

Cada Espacio es independiente: tiene sus propios campos, lotes, insumos, campañas y números.
Ningún dato se comparte entre espacios. Un espacio se puede **exportar a un archivo**
e **importar** en otro dispositivo (para pasárselo al cliente o hacer respaldo).

---

## 3. Stack técnico

| Pieza | Elección | Motivo |
|---|---|---|
| Lenguaje | TypeScript (modo `strict`) | Errores detectados antes de ejecutar |
| Framework | React + Vite | Simple, rápido, muy conocido |
| Base de datos | IndexedDB vía **Dexie** (`dexie` + `dexie-react-hooks`) | Datos locales, sin servidor |
| Estilos | Tailwind CSS | Rápido para mobile-first |
| Ruteo | React Router | Navegación entre pantallas |
| PWA | `vite-plugin-pwa` | Instalable y offline |
| Gráficos (fase 2+) | Recharts | Simple |
| Hosting | GitHub Pages / Netlify / Vercel (estático) | Gratis |

**Sin backend. Sin login. Sin servicios pagos.**

### Estructura de carpetas
```
src/
  db/            → definición de Dexie, tablas, migraciones
  modelo/        → tipos TypeScript del dominio (este documento, sección 5)
  calculos/      → funciones puras de cálculo (sección 6), con tests
  pantallas/     → un archivo por pantalla
  componentes/   → componentes reutilizables (formularios, tarjetas, selector de espacio)
  utilidades/    → moneda, unidades, fechas
```

### Convenciones de código
- **Nombres del dominio en español** (`Lote`, `Campania`, `CultivoEnLote`, `calcularMargen`).
  Los términos agropecuarios no tienen buena traducción y mezclar idiomas confunde.
  Usar `Campania` (sin ñ) en identificadores; en la interfaz se muestra "Campaña".
- La interfaz de usuario está **toda en español rioplatense** (vos, "cargá", "elegí").
- Los cálculos van en `src/calculos/` como **funciones puras** (reciben datos, devuelven
  resultados, no tocan la base). Cada función de cálculo tiene tests con Vitest.
- IDs: strings generados con `crypto.randomUUID()`.
- Fechas: string ISO `YYYY-MM-DD`.
- Mobile-first: todo tiene que usarse cómodo en un celular con una mano.

---

## 4. Conceptos clave (reglas de negocio)

### 4.1 Lote ≠ Cultivo
Un lote puede tener más de un cultivo en la misma campaña (ej. trigo + soja de segunda).
Por eso **los costos se asignan al `CultivoEnLote`**, no al lote.
El alquiler pertenece al lote y se reparte entre los cultivos que lo ocuparon
según un porcentaje editable (por defecto, partes iguales).

### 4.2 Moneda
En Argentina conviven pesos y dólares, y la inflación hace incomparables los pesos
entre fechas. Por eso **todo importe guarda su moneda original y el tipo de cambio
del día** en que ocurrió:

```ts
type Moneda = 'ARS' | 'USD';
interface Importe {
  monto: number;        // en la moneda original
  moneda: Moneda;
  tipoCambio: number;   // ARS por USD en la fecha del movimiento
}
```

- Los reportes se muestran en **USD por defecto**, con opción de ver en ARS.
- Conversión: `usd = moneda === 'USD' ? monto : monto / tipoCambio`.
- Al cargar un importe, el tipo de cambio se precarga con el último usado (editable).
  (Fase 3: sugerir cotización oficial automáticamente cuando hay señal.)

### 4.3 Unidades
- Internamente: **kg** para granos y forrajes, **ha** para superficie.
- En pantalla, el usuario elige ver **qq** (100 kg) o **tn** (1000 kg).
- Precios de granos se cargan por **tn** (como se cotizan) y se convierten internamente.

### 4.4 Tenencia de la tierra y alquiler
- **Alquilado:** se carga el contrato por campaña. Modalidades:
  - `qq_soja_ha`: X quintales de soja por ha (se valúan al precio de soja que el usuario indique).
  - `monto_ha`: monto fijo por ha (en ARS o USD).
  - `porcentaje_cosecha`: % de la producción.
- **Propio:** se carga un **alquiler de referencia** (lo que cobraría si lo alquilara).
  Es un *costo de oportunidad*: los reportes muestran el margen **con y sin** él.

### 4.5 Gastos de estructura
Gastos que no pertenecen a ningún lote (contador, seguros, sueldos fijos, vehículos,
impuesto inmobiliario). Se cargan por campaña y se **prorratean por hectárea** entre
todos los cultivos de la campaña.

### 4.6 Destino de la producción
Lo cosechado de un `CultivoEnLote` puede ir a:
- **Venta** (precio, fecha, gastos comerciales).
- **Stock** (silo bolsa, acopio) — pendiente de vender o usar.
- **Consumo interno** → confección de **Reservas** (rollos, silo, grano para alimento)
  → **Suministro** a un **Rodeo**.

### 4.7 Valuación del consumo interno (clave para campos mixtos)
Todo lo que va a consumo interno se valúa **de dos formas a la vez**:
- **A costo:** lo que costó producirlo (costo por kg del cultivo de origen + labores de confección).
- **A mercado:** lo que se hubiera cobrado vendiéndolo (precio de referencia, neto de gastos comerciales).

La diferencia le muestra al productor si le conviene más vender el grano o transformarlo.

### 4.8 Impuestos (fase 3)
Son **estimaciones**. Las alícuotas son **parámetros editables por espacio**, con fecha
de vigencia y una nota. **Nunca se fijan alícuotas en el código.**
La app muestra siempre el aviso: "Estimación orientativa. Consultá con tu contador."

Nota: los derechos de exportación ya vienen descontados en el precio que paga el comprador.
La app los muestra como información, no los vuelve a restar.

---

## 5. Modelo de datos

Todas las entidades (salvo `Espacio`) llevan `espacioId` para filtrar rápido por espacio.

```ts
// ---------- Nivel superior ----------
interface Espacio {
  id: string;
  nombre: string;                 // "La Esperanza" o "Cliente: Juan Pérez"
  esPropio: boolean;              // true = del usuario; false = cliente de un asesor
  provincia: string;
  condicionFiscal: 'responsable_inscripto' | 'monotributo' | 'otro';
  monedaReporte: Moneda;          // por defecto 'USD'
  unidadGrano: 'qq' | 'tn';       // por defecto 'qq'
  creadoEn: string;
}

interface Campania {
  id: string;
  espacioId: string;
  nombre: string;                 // "2026/27"
  fechaInicio: string;
  fechaFin: string;
}

// ---------- Tierra ----------
interface Campo {
  id: string;
  espacioId: string;
  nombre: string;
  localidad?: string;
  provincia?: string;
}

interface Lote {
  id: string;
  espacioId: string;
  campoId: string;
  nombre: string;                 // "Lote 4 - El bajo"
  hectareas: number;
  tenencia: 'propio' | 'alquilado';
}

interface AlquilerLote {          // uno por lote por campaña
  id: string;
  espacioId: string;
  loteId: string;
  campaniaId: string;
  tipo: 'contrato' | 'referencia';   // referencia = costo de oportunidad (lote propio)
  modalidad: 'qq_soja_ha' | 'monto_ha' | 'porcentaje_cosecha';
  valor: number;                  // qq/ha, monto/ha o % según modalidad
  importePorHa?: Importe;         // solo si modalidad = monto_ha
  precioSojaReferencia?: Importe; // USD/tn, solo si modalidad = qq_soja_ha
  notas?: string;
}

// ---------- Producción ----------
type TipoCultivo =
  'soja' | 'maiz' | 'trigo' | 'girasol' | 'sorgo' | 'cebada' |
  'pastura' | 'verdeo' | 'otro';

interface CultivoEnLote {
  id: string;
  espacioId: string;
  loteId: string;
  campaniaId: string;
  cultivo: TipoCultivo;
  nombreCultivo?: string;         // si cultivo = 'otro'
  ciclo: 'primera' | 'segunda';
  hectareas: number;              // por defecto las del lote
  porcentajeAlquiler: number;     // % del alquiler del lote que absorbe (0-100)
  fechaSiembra?: string;
  rindeEstimadoKgHa?: number;
  precioEstimado?: Importe;       // por tn
}

interface Insumo {                // catálogo del espacio
  id: string;
  espacioId: string;
  nombre: string;                 // "Glifosato 66%", "Urea", "Semilla DM 46i20"
  categoria: 'semilla' | 'fertilizante' | 'herbicida' | 'insecticida' |
             'fungicida' | 'combustible' | 'otro';
  unidad: 'kg' | 'l' | 'bolsa' | 'unidad';
  precioReferencia?: Importe;     // por unidad; se precarga al aplicarlo
}

interface Labor {
  id: string;
  espacioId: string;
  cultivoEnLoteId: string;
  tipo: 'siembra' | 'pulverizacion' | 'fertilizacion' | 'cosecha' |
        'labranza' | 'enrollado' | 'picado' | 'flete' | 'otra';
  fecha: string;
  hectareas: number;              // por defecto las del cultivo
  modalidad: 'contratada' | 'propia';
  costoPorHa?: Importe;           // tarifa del contratista o costo propio estimado
  notas?: string;
}

interface InsumoAplicado {
  id: string;
  espacioId: string;
  laborId: string;
  insumoId: string;
  dosisPorHa: number;             // en la unidad del insumo
  precioUnitario: Importe;        // precargado desde el catálogo, editable
}

interface GastoEstructura {
  id: string;
  espacioId: string;
  campaniaId: string;
  concepto: string;
  categoria: 'administracion' | 'seguros' | 'personal' | 'vehiculos' |
             'impuestos_fijos' | 'mantenimiento' | 'otro';
  fecha: string;
  importe: Importe;
}

// ---------- Cosecha y destinos ----------
interface Cosecha {
  id: string;
  espacioId: string;
  cultivoEnLoteId: string;
  fecha: string;
  kg: number;
}

interface Venta {
  id: string;
  espacioId: string;
  cultivoEnLoteId: string;
  fecha: string;
  kg: number;
  precioPorTn: Importe;
  comprador?: string;
  gastosComerciales: { concepto: string; importe: Importe }[]; // flete, comisión, secada, paritaria
}

interface MovimientoStock {
  id: string;
  espacioId: string;
  cultivoEnLoteId: string;
  fecha: string;
  kg: number;                     // + entra a stock, - sale
  ubicacion?: string;             // "silo bolsa lote 3", "acopio X"
}

// ---------- Ganadería (versión simple) ----------
interface Reserva {               // rollos, silo, grano destinado a alimento
  id: string;
  espacioId: string;
  tipo: 'rollo' | 'silo' | 'grano' | 'otro';
  origenCultivoEnLoteId: string;
  fecha: string;
  kgOrigen: number;               // kg del cultivo de origen que se destinaron
  // Si toda la producción de un lote se hizo reserva (ej. pastura enrollada),
  // kgOrigen = total y el costo es todo el del cultivo.
  cantidad: number;               // ej. 120 (rollos)
  unidad: 'rollo' | 'kg' | 'tn';
  kgPorUnidad?: number;           // ej. 450 kg por rollo
  laborIds: string[];             // labores de confección (enrollado, picado)
  precioMercadoReferencia?: Importe; // por unidad o por tn, para valuar a mercado
}

interface Rodeo {
  id: string;
  espacioId: string;
  nombre: string;                 // "Recría", "Vacas de cría"
  cabezas?: number;
}

interface Suministro {
  id: string;
  espacioId: string;
  rodeoId: string;
  reservaId: string;
  fecha: string;
  cantidad: number;               // en la unidad de la reserva
}

// ---------- Impuestos (fase 3) ----------
interface ParametroImpositivo {
  id: string;
  espacioId: string;
  concepto: 'iibb' | 'retencion_ganancias' | 'retencion_iva' |
            'derecho_exportacion' | 'otro';
  cultivo?: TipoCultivo;          // si aplica a un cultivo puntual
  alicuota: number;               // en %
  vigenteDesde: string;
  nota?: string;                  // "Confirmado con contador el ..."
}
```

---

## 6. Reglas de cálculo

Todos los cálculos se hacen en **USD** (convirtiendo cada `Importe` con su propio
tipo de cambio) y se presentan en la moneda que elija el usuario.

Para un `CultivoEnLote` (CL) en una campaña:

| Indicador | Fórmula |
|---|---|
| Costo de labores | Σ (costoPorHa × hectareas) de sus labores |
| Costo de insumos | Σ (dosisPorHa × precioUnitario × hectareas de la labor) |
| **Costo directo** | labores + insumos |
| Alquiler asignado | alquiler total del lote en la campaña × porcentajeAlquiler / 100 |
| Estructura asignada | total gastos estructura de la campaña × (ha del CL / ha totales de todos los CL de la campaña) |
| **Costo total** | costo directo + alquiler asignado + estructura asignada |
| Kg cosechados | Σ kg de sus cosechas |
| **Costo por kg** | costo total / kg cosechados |
| Ingreso por ventas | Σ (kg × precioPorTn / 1000) − gastos comerciales |
| Valor de lo no vendido | (stock + consumo interno) valuado a precio de referencia (neto estimado) |
| **Margen bruto** | ingresos + valor no vendido − costo directo |
| **Margen neto** | margen bruto − alquiler asignado − estructura asignada |
| **Rinde de indiferencia** (kg/ha) | costo total por ha / precio neto por kg |

Notas:
- Si el lote es propio, el "alquiler" es el de referencia: mostrar **margen neto con y sin** costo de oportunidad.
- Alquiler `qq_soja_ha`: `valor × 100 kg × hectareas × precioSojaReferencia / 1000`.
- Alquiler `porcentaje_cosecha`: `kg cosechados × valor / 100`, valuado al precio de venta promedio o de referencia.
- Mientras no haya cosecha, usar `rindeEstimadoKgHa` y `precioEstimado` y marcar el resultado como **"Proyectado"**.

### Costo de una reserva (rollo, silo, grano para alimento)
```
costo origen     = kgOrigen × costo por kg del CL de origen
costo confección = Σ costo de sus labores de confección
costo total      = costo origen + costo confección
costo por unidad = costo total / cantidad
costo por kg     = costo total / (cantidad × kgPorUnidad)
valor a mercado  = cantidad × precioMercadoReferencia
diferencia       = valor a mercado − costo total
```
El costo de alimentación de un rodeo es la suma de sus suministros valuados a costo
(y en paralelo a mercado).

---

## 7. Fases de desarrollo

### Fase 1 — Núcleo (MVP) ✅ terminada
1. Proyecto base: Vite + React + TS + Tailwind + Dexie + Router + PWA.
2. Espacios: crear, renombrar, elegir activo (selector), borrar con confirmación.
3. Campañas, campos y lotes (ABM).
4. Cultivos en lote.
5. Catálogo de insumos.
6. Labores con insumos aplicados.
7. Alquiler (contrato o referencia).
8. Cosecha y ventas.
9. Pantalla **"Margen por lote"**: tarjeta por cultivo con costo directo, costo total,
   costo/ha, costo/kg, margen y rinde de indiferencia. Proyectado vs real.
10. Exportar / importar un espacio a archivo JSON.

### Fase 2 — Campo mixto
- Gastos de estructura y prorrateo.
- Stock.
- Reservas, rodeos y suministros. Pantalla "Costo de alimentación" con valuación a costo vs mercado.
- Comparativa entre lotes y cultivos (gráficos).

### Fase 3 — Avanzado
- Parámetros impositivos y estimación de impuestos.
- Comparativa entre campañas.
- Alertas de desvío (costo real vs presupuestado).
- Plantillas de labores por cultivo para cargar más rápido.
- Sugerencia automática del tipo de cambio.

### Decisiones tomadas al construir la fase 1
- **Precio de referencia** para valuar lo no vendido: el precio estimado del cultivo; si no hay, el promedio neto de las ventas.
- **Rinde de indiferencia** = costo total por ha ÷ precio efectivo por kg (ingreso total ÷ kg producidos).
  Con alquiler a `porcentaje_cosecha`: (costo total − alquiler) por ha ÷ (precio × (1 − %)).
- **Alquiler a % de cosecha**: cada cultivo entrega su % de lo que produce; no usa `porcentajeAlquiler`.
- **Costo de oportunidad**: se decide por la tenencia actual del lote (propio = referencia).
- Al borrar un cultivo de un lote con doble cultivo, los que quedan vuelven a sumar 100% del alquiler.
- **Totales de campaña** por hectárea física (un lote con doble cultivo cuenta una vez).
- **Números**: formato argentino. "1.450" = mil cuatrocientos cincuenta; "12,5" = doce y medio.
- Al cargar una labor nueva, el precio del insumo actualiza el precio de referencia del catálogo.
- Gastos de estructura: todavía no se cargan (fase 2). La pantalla de resultados lo aclara.

---

## 8. Reglas para el agente de código

1. **Una tarea por vez.** Hacé solo lo que pide la tarea. No agregues funcionalidades ni refactorices otras partes sin que se pida.
2. **No cambies este documento** salvo que la tarea lo pida.
3. **No cambies el modelo de datos** sin pedirlo. Si hace falta un campo nuevo, proponelo y esperá confirmación.
4. Si cambia el esquema de Dexie, **subí la versión** y escribí la migración. Nunca borres datos del usuario.
5. Cálculos: funciones puras en `src/calculos/` + tests. Nada de cálculos sueltos dentro de componentes.
6. Al terminar cada tarea: verificá que compile (`npm run build`), que pasen los tests (`npm test`) y resumí qué archivos tocaste.
7. Sin dependencias pagas ni servicios externos. Antes de instalar una librería nueva, justificá por qué.

---

## 9. Decisiones pendientes (confirmar con un ingeniero agrónomo / contador)

- [ ] Criterio de reparto del alquiler en doble cultivo (¿partes iguales, por duración, otro?).
- [ ] Criterio de prorrateo de gastos de estructura (¿solo por ha, o ponderar por cultivo?).
- [ ] Qué gastos comerciales típicos precargar (flete corto/largo, comisión, secada, paritaria, sellado).
- [ ] Alícuotas impositivas por defecto según provincia (fase 3, con contador).
- [ ] Cómo valuar el grano en stock (¿precio pizarra del día, precio estimado?).
