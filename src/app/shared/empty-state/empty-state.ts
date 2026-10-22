import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  template: `<div class="empty-state">
    <span class="empty-icon"><app-icon [name]="icon()" /></span>
    <h3>{{ title() }}</h3>
    <p>{{ description() }}</p>
    <ng-content />
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input<IconName>('layers');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
