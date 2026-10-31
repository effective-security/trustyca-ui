import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface KvItem {
  readonly key: string;
  readonly value: string | number | null | undefined;
  /** True for identifiers and hashes: monospace, break anywhere */
  readonly mono?: boolean;
  /** The text of an empty value, '—' by default */
  readonly empty?: string;
}

/** A definition list of labels and values, for metadata, claims and overviews */
@Component({
  selector: 'app-kv-list',
  template: `<dl class="kv-list" [class.wide]="wide()">
    @for (item of items(); track item.key) {
      <dt>{{ item.key }}</dt>
      <dd [class.mono]="item.mono">{{ text(item) }}</dd>
    }
  </dl>`,
  styles: `
    .kv-list {
      display: grid;
      grid-template-columns: minmax(110px, max-content) 1fr;
      gap: 10px 20px;
      margin: 0;
      padding: 20px 24px;
      font-size: 12px;
    }
    .kv-list.wide {
      grid-template-columns: minmax(160px, max-content) 1fr;
    }
    dt {
      color: var(--muted);
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    dd.mono {
      font-family: var(--mono);
      font-size: 11px;
    }
    @media (max-width: 600px) {
      .kv-list,
      .kv-list.wide {
        grid-template-columns: 1fr;
        gap: 4px;
        padding: 16px 18px;
      }
      dt:not(:first-child) {
        margin-top: 10px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KvList {
  readonly items = input.required<readonly KvItem[]>();
  /** True for long labels */
  readonly wide = input(false);

  protected text(item: KvItem): string {
    return item.value === null || item.value === undefined || item.value === ''
      ? (item.empty ?? '—')
      : String(item.value);
  }
}
