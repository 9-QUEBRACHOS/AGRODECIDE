// Dibuja el informe en PDF (A4 apaisado), listo para imprimir o mandar.
// Se carga solo cuando el usuario pide el informe.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Celda, Informe, Tabla } from './modelo';

const VERDE: [number, number, number] = [28, 58, 53];
const VERDE_CLARO: [number, number, number] = [227, 239, 231];
const DORADO: [number, number, number] = [233, 196, 106];
const GRIS_TEXTO: [number, number, number] = [87, 83, 78];

const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function texto(v: Celda, tipo: string, simbolo: string): string {
  if (v === null || v === '') return tipo === 'texto' || tipo === 'fecha' ? '' : '—';
  if (typeof v === 'string') return v;
  switch (tipo) {
    case 'dinero': return `${v < 0 ? '-' : ''}${simbolo} ${(Math.abs(v) < 10 ? nf2 : nf0).format(Math.abs(v))}`;
    case 'decimal': return nf1.format(v);
    case 'porcentaje': return `${nf1.format(v)}%`;
    default: return nf0.format(v);
  }
}

async function cargarLogo(): Promise<string | null> {
  try {
    const r = await fetch('./icono-192.png');
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    });
  } catch { return null; }
}

export async function generarPdf(inf: Informe): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const M = 12;
  const logo = await cargarLogo();

  const cabecera = () => {
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, ancho, 20, 'F');
    if (logo) doc.addImage(logo, 'PNG', M, 3.5, 13, 13);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('AGRODECIDE', M + 17, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DORADO);
    doc.text('DEL DATO A LA DECISIÓN', M + 17, 15);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`${inf.titulo} ${inf.campania}`, ancho - M, 9, { align: 'right' });
    doc.setFontSize(8.5);
    doc.text(`${inf.espacio}  ·  Generado el ${inf.generado}`, ancho - M, 14.5, { align: 'right' });
  };
  const pie = () => {
    const paginas = doc.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(...GRIS_TEXTO);
      doc.text('Estimación orientativa. No reemplaza el asesoramiento de un contador.  ·  agrodecide.github.io', M, alto - 6);
      doc.text(`Página ${p} de ${paginas}`, ancho - M, alto - 6, { align: 'right' });
    }
  };

  // ---------- Página 1: resumen
  cabecera();
  let y = 30;
  doc.setTextColor(...VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Resumen de la campaña', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_TEXTO);
  const ha = `${nf1.format(inf.hectareas)} ha${inf.hectareasSembradas > inf.hectareas + 0.01 ? ` (${nf1.format(inf.hectareasSembradas)} ha sembradas)` : ''}  ·  Importes en ${inf.simboloMoneda}`;
  doc.text(ha, M, y + 5);
  y += 10;

  // Tarjetas grandes: margen por ha y margen total
  const margen = inf.resumen.find((r) => r.etiqueta === 'Margen neto');
  const tarjetas: [string, number | null][] = [
    ['MARGEN NETO POR HECTÁREA', margen?.porHa ?? null],
    ['MARGEN NETO TOTAL', margen?.total ?? null],
  ];
  const anchoTarjeta = 70;
  tarjetas.forEach(([t, v], i) => {
    const x = M + i * (anchoTarjeta + 6);
    doc.setFillColor(...(i === 0 ? VERDE : VERDE_CLARO));
    doc.roundedRect(x, y, anchoTarjeta, 22, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    if (i === 0) doc.setTextColor(...DORADO); else doc.setTextColor(...VERDE);
    doc.text(t, x + 5, y + 7);
    doc.setFontSize(17);
    if (i === 0) doc.setTextColor(255, 255, 255); else doc.setTextColor(...VERDE);
    doc.text(texto(v, 'dinero', inf.simboloMoneda), x + 5, y + 17);
  });

  // Tabla resumen por ha / total, al lado
  autoTable(doc, {
    startY: y,
    margin: { left: M + 2 * anchoTarjeta + 18, right: M },
    head: [['Concepto', 'Por hectárea', 'Total']],
    body: inf.resumen.map((r) => [r.etiqueta, texto(r.porHa, 'dinero', inf.simboloMoneda), texto(r.total, 'dinero', inf.simboloMoneda)]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.8, lineColor: [214, 211, 209], lineWidth: 0.2 },
    headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right';
      if (d.section === 'body' && inf.resumen[d.row.index]?.destacado) {
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.fillColor = VERDE_CLARO;
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = Math.max(y + 28, (doc as any).lastAutoTable.finalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_TEXTO);
  for (const n of inf.notas) { doc.text(`•  ${n}`, M, y); y += 4.5; }
  y += 3;

  // ---------- Tablas
  const dibujar = (tabla: Tabla, primera: boolean) => {
    if (!primera && y > alto - 60) { doc.addPage(); cabecera(); y = 30; }
    doc.setTextColor(...VERDE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(tabla.titulo, M, y);
    doc.setFont('helvetica', 'normal');
    if (tabla.descripcion) {
      doc.setFontSize(8);
      doc.setTextColor(...GRIS_TEXTO);
      doc.text(tabla.descripcion, M, y + 4.5);
    }
    const total = tabla.total && tabla.filas.length ? [tabla.total] : [];
    autoTable(doc, {
      startY: y + (tabla.descripcion ? 7 : 3),
      margin: { left: M, right: M, top: 26, bottom: 12 },
      head: [tabla.columnas.map((c) => c.titulo)],
      body: tabla.filas.length
        ? tabla.filas.map((f) => f.map((v, i) => texto(v, tabla.columnas[i].tipo, inf.simboloMoneda)))
        : [[{ content: 'Sin datos cargados.', colSpan: tabla.columnas.length, styles: { fontStyle: 'italic', textColor: GRIS_TEXTO } }]],
      foot: total.map((f) => f.map((v, i) => texto(v, tabla.columnas[i].tipo, inf.simboloMoneda))),
      showFoot: 'lastPage',
      theme: 'striped',
      styles: { fontSize: 7.6, cellPadding: 1.5, overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold', fontSize: 7.4 },
      footStyles: { fillColor: VERDE_CLARO, textColor: VERDE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 246, 243] },
      columnStyles: Object.fromEntries(tabla.columnas.map((c, i) => [i, {
        halign: c.tipo === 'texto' || c.tipo === 'fecha' ? 'left' : 'right',
        cellWidth: c.tipo === 'texto' ? 'auto' : 'wrap',
      }])),
      didParseCell: (d) => {
        const col = tabla.columnas[d.column.index];
        if ((d.section === 'head' || d.section === 'foot') && col && col.tipo !== 'texto' && col.tipo !== 'fecha') d.cell.styles.halign = 'right';
        // márgenes negativos en rojo
        if (d.section === 'body' && col?.tipo === 'dinero' && /margen/i.test(col.titulo)) {
          const v = tabla.filas[d.row.index]?.[d.column.index];
          if (typeof v === 'number') d.cell.styles.textColor = v < 0 ? [192, 86, 59] : [45, 106, 79];
        }
      },
      didDrawPage: () => { cabecera(); },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  };
  inf.tablas.forEach((t, i) => dibujar(t, i === 0));
  void ancho;

  pie();
  return doc.output('blob');
}
