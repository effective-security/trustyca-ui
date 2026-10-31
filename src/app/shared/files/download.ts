import { log } from 'src/libts/logging';

/**
 * Offers a text as a file to save. Nothing is kept: the object URL is
 * revoked once the browser took the download.
 */
export function downloadText(
  fileName: string,
  text: string,
  type = 'text/plain',
  doc: Document = document,
): boolean {
  if (typeof URL.createObjectURL !== 'function') {
    log.warn('downloadText: the browser offers no object URLs');
    return false;
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = doc.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
