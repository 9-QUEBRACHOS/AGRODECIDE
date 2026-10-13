// Dibuja el informe en un archivo Excel (.xlsx) con formato profesional.
// Se carga solo cuando el usuario pide el informe (no pesa en el arranque de la app).
import ExcelJS from 'exceljs';
import type { Celda, Informe, Tabla, TipoColumna } from './modelo';

const VERDE = 'FF1C3A35';
const VERDE_CLARO = 'FFE3EFE7';
const GRIS = 'FFF5F5F4';
const BORDE = { style: 'thin' as const, color: { argb: 'FFD6D3D1' } };

function formatoNumero(tipo: TipoColumna, simbolo: string) {
  switch (tipo) {
    case 'dinero': return `"${simbolo} "#,##0;[Red]"-${simbolo} "#,##0`;
    case 'decimal': return '#,##0.0';
    case 'numero': return '#,##0';
    case 'porcentaje': return '0.0"%"';
    default: return '@';
  }
}

async function cargarLogo(): Promise<string | null> {
  try {
    const r = await fetch('./icono-192.png');
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1] ?? null);
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    });
  } catch { return null; }
}

function encabezado(ws: ExcelJS.Worksheet, inf: Informe, subtitulo: string, columnas: number, logo: number | null) {
  ws.mergeCells(1, 1, 1, columnas);
  ws.mergeCells(2, 1, 2, columnas);
  ws.mergeCells(3, 1, 3, columnas);
  const t = ws.getCell(1, 1);
  t.value = `AGRODECIDE  ·  ${subtitulo}`;
  t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  t.alignment = { vertical: 'middle', indent: logo !== null ? 5 : 1 };
  ws.getRow(1).height = 34;
  for (let c = 1; c <= columnas; c++) ws.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
  const sub = ws.getCell(2, 1);
  sub.value = `${inf.espacio}  ·  Campaña ${inf.campania}  ·  Generado el ${inf.generado}  ·  Importes en ${inf.simboloMoneda}`;
  sub.font = { size: 11, color: { argb: 'FF57534E' } };
  sub.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(2).height = 30;
  ws.getRow(2).height = 20;
  if (logo !== null) ws.addImage(logo, { tl: { col: 0.15, row: 0.12 }, ext: { width: 34, height: 34 } });
}

function escribirTabla(ws: ExcelJS.Worksheet, tabla: Tabla, inf: Informe, filaInicio: number) {
  let fila = filaInicio;
  if (tabla.descripcion) {
    ws.mergeCells(fila, 1, fila, tabla.columnas.length);
    const d = ws.getCell(fila, 1);
    d.value = tabla.descripcion;
    d.font = { italic: true, size: 10, color: { argb: 'FF78716C' } };
    fila++;
  }
  const cab = ws.getRow(fila);
  tabla.columnas.forEach((c, i) => {
    const cell = cab.getCell(i + 1);
    cell.value = c.titulo;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    cell.alignment = { vertical: 'middle', horizontal: c.tipo === 'texto' || c.tipo === 'fecha' ? 'left' : 'right', wrapText: true };
    cell.border = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
  });
  cab.height = 32;
  const filaCabecera = fila;
  fila++;

  const escribir = (valores: Celda[], estilo: 'normal' | 'par' | 'total') => {
    const r = ws.getRow(fila);
    valores.forEach((v, i) => {
      const col = tabla.columnas[i];
      const cell = r.getCell(i + 1);
      cell.value = v === null || v === '' ? null : v;
      if (typeof v === 'number') {
        cell.numFmt = formatoNumero(col.tipo, inf.simboloMoneda);
        cell.alignment = { horizontal: 'right' };
      }
      cell.border = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
      if (estilo === 'par') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
      if (estilo === 'total') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_CLARO } };
        cell.font = { bold: true };
      }
    });
    fila++;
  };
  if (tabla.filas.length === 0) {
    ws.mergeCells(fila, 1, fila, tabla.columnas.length);
    ws.getCell(fila, 1).value = 'Sin datos cargados.';
    ws.getCell(fila, 1).font = { italic: true, color: { argb: 'FF78716C' } };
    fila++;
  }
  tabla.filas.forEach((f, i) => escribir(f, i % 2 ? 'par' : 'normal'));
  if (tabla.total && tabla.filas.length) escribir(tabla.total, 'total');
  return { filaCabecera, ultima: fila - 1 };
}

export async function generarExcel(inf: Informe): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AgroDecide';
  wb.created = new Date();
  const b64 = await cargarLogo();
  const logo = () => (b64 ? wb.addImage({ base64: b64, extension: 'png' }) : null);

  // ---------- Hoja Resumen
  const ws = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }], properties: { tabColor: { argb: VERDE } } });
  ws.columns = [{ width: 34 }, { width: 22 }, { width: 26 }, { width: 4 }];
  encabezado(ws, inf, `${inf.titulo.toUpperCase()} ${inf.campania}`, 3, logo());
  let f = 5;
  ws.getCell(f, 1).value = 'Superficie';
  ws.getCell(f, 1).font = { bold: true };
  ws.getCell(f, 2).value = inf.hectareas;
  ws.getCell(f, 2).numFmt = '#,##0.0" ha"';
  if (inf.hectareasSembradas > inf.hectareas + 0.01) {
    ws.getCell(f, 3).value = `${inf.hectareasSembradas.toLocaleString('es-AR')} ha sembradas`;
    ws.getCell(f, 3).font = { color: { argb: 'FF78716C' } };
  }
  f += 2;
  const cab = ws.getRow(f);
  ['Concepto', 'Por hectárea', 'Total'].forEach((t, i) => {
    const c = cab.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    c.alignment = { horizontal: i ? 'right' : 'left' };
  });
  cab.height = 22;
  f++;
  const fmt = formatoNumero('dinero', inf.simboloMoneda);
  for (const r of inf.resumen) {
    const row = ws.getRow(f);
    row.getCell(1).value = r.etiqueta;
    row.getCell(2).value = r.porHa;
    row.getCell(3).value = r.total;
    row.getCell(2).numFmt = fmt;
    row.getCell(3).numFmt = fmt;
    for (let c = 1; c <= 3; c++) {
      const cell = row.getCell(c);
      cell.border = { bottom: BORDE };
      if (r.destacado) {
        cell.font = { bold: true, size: 12, color: { argb: VERDE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_CLARO } };
      }
    }
    row.height = r.destacado ? 22 : 18;
    f++;
  }
  f++;
  for (const n of inf.notas) {
    ws.mergeCells(f, 1, f, 3);
    ws.getCell(f, 1).value = `• ${n}`;
    ws.getCell(f, 1).font = { size: 9, italic: true, color: { argb: 'FF78716C' } };
    ws.getCell(f, 1).alignment = { wrapText: true };
    ws.getRow(f).height = 26;
    f++;
  }
  ws.getCell(f + 1, 1).value = 'Generado con AgroDecide · agrodecide.github.io';
  ws.getCell(f + 1, 1).font = { size: 9, color: { argb: 'FFA07A1C' } };

  // ---------- Una hoja por tabla
  for (const tabla of inf.tablas) {
    const hoja = wb.addWorksheet(tabla.titulo.slice(0, 31), { views: [{ showGridLines: false }] });
    hoja.columns = tabla.columnas.map((c) => ({ width: Math.max(9, c.ancho + 2) }));
    encabezado(hoja, inf, tabla.titulo.toUpperCase(), tabla.columnas.length, logo());
    const { filaCabecera, ultima } = escribirTabla(hoja, tabla, inf, 4);
    hoja.views = [{ state: 'frozen', ySplit: filaCabecera, showGridLines: false }];
    if (tabla.filas.length) {
      hoja.autoFilter = { from: { row: filaCabecera, column: 1 }, to: { row: ultima - (tabla.total ? 1 : 0), column: tabla.columnas.length } };
    }
    hoja.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  }
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, paperSize: 9 };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
