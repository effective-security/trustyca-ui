import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-heading',
  template: `<div class="page-heading">
    <div>
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h1>{{ title() }}</h1>
      <p class="page-description">{{ description() }}</p>
    </div>
    <div class="page-action"><ng-content /></div>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeading {
  readonly eyebrow = input('Management console');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
