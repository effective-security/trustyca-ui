import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';

export interface ConfirmOptions {
  readonly title: string;
  readonly message: string;
  /** The consequences, one per line */
  readonly details?: readonly string[];
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** The text the user has to type before the confirmation is enabled */
  readonly typeToConfirm?: string;
  /** True for an action that destroys data: the confirmation is red */
  readonly destructive?: boolean;
}

/** The confirmation of a destructive action, typed when the options ask for it */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `<h2 mat-dialog-title>{{ options.title }}</h2>
    <mat-dialog-content>
      <p class="message">{{ options.message }}</p>
      @if (options.details?.length) {
        <ul class="consequences">
          @for (d of options.details; track d) {
            <li>{{ d }}</li>
          }
        </ul>
      }
      @if (options.typeToConfirm) {
        <p class="type-hint">
          Type <code>{{ options.typeToConfirm }}</code> to confirm.
        </p>
        <mat-form-field appearance="outline" class="type-field" subscriptSizing="dynamic">
          <mat-label>Confirmation</mat-label>
          <input
            matInput
            autocomplete="off"
            spellcheck="false"
            [value]="typed()"
            (input)="onTyped($event)"
            (keyup.enter)="ready() && close(true)"
          />
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">
        {{ options.cancelLabel || 'Cancel' }}
      </button>
      <button
        mat-flat-button
        type="button"
        class="confirm-button"
        [class.destructive]="options.destructive"
        [disabled]="!ready()"
        (click)="close(true)"
      >
        {{ options.confirmLabel || 'Confirm' }}
      </button>
    </mat-dialog-actions>`,
  styles: `
    .message,
    .consequences,
    .type-hint {
      font-size: 13px;
      line-height: 1.7;
      color: var(--ink);
    }
    .consequences {
      margin: 0 0 12px;
      padding-left: 20px;
      color: var(--muted);
    }
    .type-hint code {
      font-family: var(--mono);
      background: #f1f4ee;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .type-field {
      width: 100%;
      margin-top: 4px;
    }
    .destructive:not(:disabled) {
      --mat-button-filled-container-color: #b3261e;
      --mat-button-filled-label-text-color: #ffffff;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly options = inject<ConfirmOptions>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ConfirmDialog, boolean>>(MatDialogRef);
  protected readonly typed = signal('');
  protected readonly ready = computed(
    () => !this.options.typeToConfirm || this.typed().trim() === this.options.typeToConfirm,
  );

  protected onTyped(event: Event): void {
    this.typed.set((event.target as HTMLInputElement).value);
  }

  protected close(confirmed: boolean): void {
    this.ref.close(confirmed);
  }
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  /** Opens the confirmation; resolves true when the user confirmed */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<ConfirmDialog, ConfirmOptions, boolean>(ConfirmDialog, {
      data: options,
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: options.typeToConfirm ? 'input' : 'dialog',
      restoreFocus: true,
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}
