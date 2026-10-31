import { MatDialogConfig } from '@angular/material/dialog';

/** The configuration of a form dialog: wide, never wider than the viewport */
export function wideDialog<D>(data?: D): MatDialogConfig<D> {
  return { data, width: '640px', maxWidth: 'calc(100vw - 32px)' };
}
