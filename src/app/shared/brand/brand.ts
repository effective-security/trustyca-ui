import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-brand',
  host: { '[class.inverse]': 'inverse()' },
  template: `<img src="brand/trusty-mark.svg" width="40" height="44" alt="" />
    <span class="wordmark"
      >Trusty<span class="ca"> CA</span><small>Certification authority</small></span
    >`,
  styles: `
    :host {
      display: inline-flex;
      gap: 11px;
      align-items: center;
      color: #163733;
    }
    .wordmark {
      font-size: 25px;
      font-weight: 730;
      letter-spacing: -1px;
      line-height: 1.15;
    }
    .ca {
      font-weight: 400;
    }
    small {
      display: block;
      font-size: 8px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      white-space: nowrap;
      margin-top: 5px;
    }
    :host.inverse {
      color: #f6faf8;
    }
    :host.inverse small {
      color: #a9c1b8;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Brand {
  readonly inverse = input(false);
}
