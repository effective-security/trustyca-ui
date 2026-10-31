import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusTone } from './status-tone';

export { certificateStatusTone, issuerStatusTone, itemStatusTone } from './status-tone';
export type { StatusTone } from './status-tone';

/** One chip for every status enum: the display name from enums.ts and a tone */
@Component({
  selector: 'app-status-chip',
  template: `<span class="status-chip tone-{{ tone() }}"
    ><span class="status-dot"></span>{{ label() }}</span
  >`,
  styles: `
    :host {
      display: inline-flex;
    }
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 9px 3px 7px;
      border-radius: 999px;
      border: 1px solid var(--chip-border, #e2e7de);
      background: var(--chip-bg, #f6f8f3);
      color: var(--chip-ink, #5c6c5f);
      font-size: 10px;
      font-weight: 550;
      line-height: 1.5;
      white-space: nowrap;
    }
    .status-chip .status-dot {
      background: var(--chip-dot, #93a394);
    }
    .tone-active {
      --chip-border: #cfe3d2;
      --chip-bg: #eaf5ec;
      --chip-ink: #2a6a40;
      --chip-dot: #3f9a5c;
    }
    .tone-pending {
      --chip-border: #ecdcb4;
      --chip-bg: #fbf5e6;
      --chip-ink: #7a5a16;
      --chip-dot: #d9a62e;
    }
    .tone-archived {
      --chip-border: #dfe3df;
      --chip-bg: #f1f3f1;
      --chip-ink: #5f6a62;
      --chip-dot: #8b968d;
    }
    .tone-destroyed,
    .tone-revoked {
      --chip-border: #ecc9c6;
      --chip-bg: #fbeeec;
      --chip-ink: #8a2f29;
      --chip-dot: #c9453c;
    }
    .tone-expired {
      --chip-border: #efd3b8;
      --chip-bg: #fcf1e6;
      --chip-ink: #86481b;
      --chip-dot: #d9792d;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
}
