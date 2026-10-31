import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { wideDialog } from '../dialog/dialog-config';
import { PemViewer } from './pem-viewer';

export interface PemDialogData {
  readonly title: string;
  readonly pem: string;
  readonly fileName: string;
  /** A line under the title: the subject, the fingerprint */
  readonly subtitle?: string;
}

/** A PEM in a dialog: for the rows of a list that hold a certificate */
@Component({
  selector: 'app-pem-dialog',
  imports: [MatButtonModule, MatDialogModule, PemViewer],
  template: `<h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @if (data.subtitle) {
        <p class="pem-subtitle">{{ data.subtitle }}</p>
      }
      <app-pem-viewer [pem]="data.pem" title="PEM" [fileName]="data.fileName" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Close</button>
    </mat-dialog-actions>`,
  styles: `
    .pem-subtitle {
      margin: 0 0 12px;
      font-family: var(--mono);
      font-size: 11px;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PemDialog {
  protected readonly data = inject<PemDialogData>(MAT_DIALOG_DATA);
}

@Injectable({ providedIn: 'root' })
export class PemDialogService {
  private readonly dialog = inject(MatDialog);

  open(data: PemDialogData): void {
    this.dialog.open<PemDialog, PemDialogData>(PemDialog, wideDialog(data));
  }
}
