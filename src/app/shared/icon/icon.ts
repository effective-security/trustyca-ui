import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  layers: 'm12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5',
  certificate:
    'M14 2H5v20h7 M14 2v6h6 M14 2l6 6v4 M8 7h2 M8 11h5 M8 15h2 M18 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M15 20v3l3-1 3 1v-3',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  chevron: 'm7 10 5 5 5-5',
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a8 8 0 0 1 16 0v2',
  settings:
    'M9 3h6l1 3 3 1 3 5-2 2v3l-4 4-3-1-3 1-4-4v-3L2 12l3-5 3-1z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  logout: 'M9 4H3v16h6 M10 12h11 m-5-5 5 5-5 5',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  close: 'm6 6 12 12 M6 18 18 6',
  external: 'M7 17 17 7 M7 7h10v10',
  shield: 'm12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6z m-4 10 3 3 5-6',
  lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
  activity: 'M2 12h5l3-9 4 18 3-9h5',
  check: 'm5 12 4 4L19 6',
} as const;

export type IconName = keyof typeof paths;

@Component({
  selector: 'app-icon',
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path [attr.d]="paths[name()]" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      vertical-align: middle;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly paths = paths;
}
