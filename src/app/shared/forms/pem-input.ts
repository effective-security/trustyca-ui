import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Icon } from '../icon/icon';
import { parsePemBlocks } from './validators';

/**
 * A PEM field: paste, choose a file or drop one on it. The control carries
 * the text and its validators (`pem()`, `Validators.required`); the field
 * shows the blocks it found and the errors by name.
 */
@Component({
  selector: 'app-pem-input',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, Icon],
  template: `<div
    class="pem-input"
    [class.dragging]="dragging()"
    (dragover)="onDragOver($event)"
    (dragleave)="dragging.set(false)"
    (drop)="onDrop($event)"
  >
    <mat-form-field appearance="outline" class="pem-field">
      <mat-label>{{ label() }}</mat-label>
      <textarea
        matInput
        class="pem-text"
        [formControl]="control()"
        [rows]="rows()"
        [required]="required()"
        [placeholder]="placeholder()"
        autocomplete="off"
        spellcheck="false"
      ></textarea>
      @if (hint() && !control().hasError('pem')) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
      @if (control().hasError('required')) {
        <mat-error>{{ label() }} is required.</mat-error>
      } @else if (control().hasError('pem')) {
        <mat-error>{{ pemError() }}</mat-error>
      }
    </mat-form-field>
    <div class="pem-tools">
      <span class="pem-summary">{{ summary() }}</span>
      <input
        #fileInput
        type="file"
        class="file-input"
        [accept]="accept"
        [attr.aria-label]="'Choose a file for ' + label()"
        (change)="onFiles($event)"
      />
      <button mat-stroked-button type="button" class="file-button" (click)="fileInput.click()">
        <app-icon name="upload" />Choose file
      </button>
      @if (value()) {
        <button mat-button type="button" class="clear-button" (click)="clear()">Clear</button>
      }
    </div>
  </div>`,
  styles: `
    .pem-input {
      border-radius: 10px;
      transition: box-shadow 0.15s;
    }
    .pem-input.dragging {
      box-shadow: 0 0 0 3px #cfe3d2;
    }
    .pem-field {
      width: 100%;
    }
    .pem-text {
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1.5;
    }
    .pem-tools {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: -14px 0 8px;
      font-size: 11px;
    }
    .pem-summary {
      flex: 1;
      color: var(--muted);
    }
    .file-input {
      display: none;
    }
    .file-button,
    .clear-button {
      font-size: 11px;
    }
    .file-button app-icon {
      width: 14px;
      height: 14px;
      margin-right: 6px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PemInput {
  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly rows = input(6);
  readonly required = input(false);
  /** The block type the field expects, for the error text */
  readonly expected = input('CERTIFICATE');
  /** True when the field takes a chain: a dropped file is appended */
  readonly multiple = input(false);
  protected readonly accept = '.pem,.crt,.cer,.csr,.key,.txt,application/x-pem-file';
  protected readonly dragging = signal(false);
  /** The text of the control, as a signal */
  protected readonly value = signal('');

  protected readonly placeholder = computed(() => `-----BEGIN ${this.expected()}-----`);
  private readonly blocks = computed(() => parsePemBlocks(this.value()));
  /** 'certificate', '2 blocks: certificate'; '' for an empty field */
  protected readonly summary = computed(() => {
    const blocks = this.blocks();
    if (blocks.length === 0) {
      return this.value().trim() ? 'No PEM block found' : '';
    }
    const types = [...new Set(blocks.map((b) => b.type.toLowerCase()))].join(', ');
    return blocks.length === 1 ? types : `${blocks.length} blocks: ${types}`;
  });

  constructor() {
    // the value follows the control, which the page may replace
    effect((onCleanup) => {
      const control = this.control();
      untracked(() => this.value.set(control.value ?? ''));
      const sub = control.valueChanges.subscribe((v) => this.value.set(v ?? ''));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected pemError(): string {
    const err = this.control().getError('pem') as { reason?: string } | null;
    switch (err?.reason) {
      case 'type':
        return `Expected a ${this.expected()} block.`;
      case 'multiple':
        return 'One PEM block only.';
      default:
        return `Paste a PEM block (-----BEGIN ${this.expected()}-----) or choose a file.`;
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    void this.readFiles(event.dataTransfer?.files);
  }

  protected onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.readFiles(input.files).then(() => (input.value = ''));
  }

  protected clear(): void {
    this.control().setValue('');
    this.control().markAsDirty();
  }

  private async readFiles(files: FileList | null | undefined): Promise<void> {
    if (!files || files.length === 0) {
      return;
    }
    const texts: string[] = [];
    for (const file of Array.from(files)) {
      texts.push((await file.text()).trim());
    }
    const control = this.control();
    const current = control.value?.trim() ?? '';
    const next = this.multiple() && current ? [current, ...texts].join('\n') : texts.join('\n');
    control.setValue(next);
    control.markAsDirty();
    control.markAsTouched();
  }
}
