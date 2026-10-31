import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { downloadText } from '../files/download';
import { parsePemBlocks } from '../forms/validators';
import { Icon } from '../icon/icon';

/** A PEM text with copy and download; the parsed summary comes with the X.509 decoder */
@Component({
  selector: 'app-pem-viewer',
  imports: [MatButtonModule, Icon],
  template: `<div class="pem-viewer">
    <div class="pem-toolbar">
      <span class="pem-title">{{ title() }}</span>
      <span class="pem-meta">{{ summary() }}</span>
      <button mat-button type="button" [disabled]="!pem()" (click)="copy()">
        <app-icon [name]="copied() ? 'check' : 'copy'" />{{ copied() ? 'Copied' : 'Copy' }}
      </button>
      <button mat-button type="button" [disabled]="!pem()" (click)="download()">
        <app-icon name="download" />Download
      </button>
    </div>
    <pre class="pem-text" tabindex="0">{{ pem() || 'No data' }}</pre>
  </div>`,
  styles: `
    .pem-viewer {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: #fcfdfb;
    }
    .pem-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px 6px 16px;
      border-bottom: 1px solid var(--border);
      background: white;
      font-size: 12px;
    }
    .pem-title {
      font-weight: 600;
    }
    .pem-meta {
      flex: 1;
      color: var(--muted);
      font-size: 11px;
    }
    .pem-toolbar app-icon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
    }
    .pem-text {
      margin: 0;
      padding: 14px 16px;
      max-height: 320px;
      overflow: auto;
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1.55;
      color: #2f4536;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PemViewer {
  readonly pem = input.required<string>();
  readonly title = input('PEM');
  readonly fileName = input('certificate.pem');
  protected readonly copied = signal(false);
  protected readonly summary = computed(() => {
    const blocks = parsePemBlocks(this.pem());
    if (blocks.length === 0) {
      return '';
    }
    const types = [...new Set(blocks.map((b) => b.type.toLowerCase()))].join(', ');
    return blocks.length === 1 ? types : `${blocks.length} blocks: ${types}`;
  });

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.pem());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      this.copied.set(false);
    }
  }

  protected download(): void {
    downloadText(this.fileName(), this.pem(), 'application/x-pem-file');
  }
}
