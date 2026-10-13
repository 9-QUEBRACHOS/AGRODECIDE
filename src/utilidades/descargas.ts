/**
 * Entrega un archivo al usuario. En celulares usa "Compartir" (la descarga directa no anda
 * en iPhone con la app instalada); en la computadora lo descarga.
 */
export async function entregarArchivo(nombre: string, contenido: Blob, titulo: string) {
  const archivo = new File([contenido], nombre, { type: contenido.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (/Android|iPhone|iPad/i.test(navigator.userAgent) && nav.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: titulo }); return; }
    catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(contenido);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
