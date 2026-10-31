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
  checkCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 m-4 9 3 3 5-6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M20 20l-4-4',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  plus: 'M12 5v14 M5 12h14',
  edit: 'M4 20h4L18 10l-4-4L4 16z M13 7l4 4',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
  copy: 'M9 9h10v12H9z M5 15V3h10',
  download: 'M12 4v12 m-5-5 5 5 5-5 M4 20h16',
  more: 'M12 5v.01 M12 12v.01 M12 19v.01',
  warning: 'm12 3 10 18H2z M12 10v4 M12 18v.01',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v5 M12 8v.01',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7 M20 4v5h-5',
  building: 'M4 21V5l8-3 8 3v16 M9 9v.01 M9 13v.01 M15 9v.01 M15 13v.01 M10 21v-4h4v4 M2 21h20',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M5.6 5.6l12.8 12.8',
  anchor: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M12 7v14 M4 13a8 8 0 0 0 16 0 M4 13H2 M20 13h2',
  document: 'M6 2h9l5 5v15H6z M15 2v5h5 M9 13h6 M9 17h6',
  key: 'M7 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 14 21 3 M17 7l3 3',
  users:
    'M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-1a7 7 0 0 1 14 0v1 M16 4a4 4 0 0 1 0 8 M22 21v-1a7 7 0 0 0-5-6.7',
  upload: 'M12 16V4 m-5 5 5-5 5 5 M4 20h16',
  archive: 'M3 4h18v4H3z M5 8v12h14V8 M10 12h4',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  arrowLeft: 'M20 12H4 m6-6-6 6 6 6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
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
