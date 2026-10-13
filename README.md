# AgroDecide — Del dato a la decisión

Aplicación web **gratuita** para productores agropecuarios: costos por hectárea, margen por
lote y rinde de indiferencia, con pesos y dólares (cada gasto con su dólar del día).

- Sin cuentas ni servidor: los datos quedan en el dispositivo de cada usuario.
- Funciona sin señal y se puede instalar en el celular como una app.
- Un asesor puede tener un "espacio" por cliente y pasárselo como archivo.

La especificación completa (modelo de datos, fórmulas, fases) está en [ESPECIFICACION.md](ESPECIFICACION.md).

## Probarla en tu computadora

Necesitás [Node.js](https://nodejs.org) (versión LTS).

```bash
npm install      # instala las dependencias (solo la primera vez)
npm run dev      # abre la app en http://localhost:5173
```

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | App en modo desarrollo, se actualiza sola al editar |
| `npm test` | Corre los tests de cálculos y base de datos |
| `npm run build` | Genera la versión para publicar en la carpeta `dist/` |
| `npm run preview` | Sirve la versión de `dist/` para probarla |

## Publicarla gratis

**GitHub Pages (recomendado):** subí este proyecto a un repositorio de GitHub y en
*Settings → Pages → Source* elegí **GitHub Actions**. Cada vez que subas un cambio a `main`,
GitHub corre los tests, arma la página y la publica en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Otras opciones gratuitas con la carpeta `dist/`:

- **Netlify Drop**: entrá a https://app.netlify.com/drop y arrastrá la carpeta `dist`.
- **GitHub Pages / Netlify / Vercel** conectados al repositorio: comando de build `npm run build`, carpeta `dist`.

## Estructura

```
src/
  modelo/      tipos del dominio y etiquetas en español
  db/          base local (Dexie), borrados en cascada, exportar/importar, campo de ejemplo
  calculos/    fórmulas puras (margen, alquiler, rinde de indiferencia) + tests
  componentes/ piezas de interfaz reutilizables
  pantallas/   Resultados, Lotes, Lote, Cultivo, Insumos, Ajustes, Bienvenida
  utilidades/  formatos de números, unidades y fechas
```

## Estado

**Fase 1 (núcleo) lista.** Próximo: gastos de estructura, stock, reservas y costo de alimentación
del rodeo (fase 2). Los cálculos son orientativos; no reemplazan a un contador.
