import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { Page, pagedResource } from '../../core/api/paged-resource';
import { ColumnDef } from './column';
import { DataTable } from './data-table';

interface Row {
  id: string;
  name: string;
  size: number;
}

const rows = (...names: string[]): Row[] =>
  names.map((name, i) => ({ id: name.toLowerCase(), name, size: (i + 1) * 10 }));

@Component({
  imports: [DataTable, ColumnDef],
  template: `<app-data-table
    label="Things"
    [rows]="rows()"
    [loading]="loading()"
    [error]="error()"
    [hasMore]="hasMore()"
    [rowId]="id"
    [clickable]="true"
    emptyTitle="No things"
    emptyDescription="Nothing to show yet."
    (loadMore)="loads = loads + 1"
    (retry)="retries = retries + 1"
    (rowClick)="clicked = $event"
  >
    <ng-container *appColumn="'Name' of rows(); header: 'Name'; primary: true; let row">{{
      row.name
    }}</ng-container>
    <ng-container *appColumn="'Size' of rows(); header: 'Size'; align: 'end'; let row">{{
      row.size
    }}</ng-container>
    <a tableEmptyAction href="#add">Add a thing</a>
  </app-data-table>`,
})
class Host {
  readonly rows = signal<Row[]>([]);
  readonly loading = signal(false);
  readonly error = signal<unknown>(undefined);
  readonly hasMore = signal(false);
  readonly id = (row: Row) => row.id;
  loads = 0;
  retries = 0;
  clicked?: Row;
}

@Component({
  imports: [DataTable, ColumnDef],
  template: `<app-data-table [paged]="things" [(pageSize)]="pageSize">
    <ng-container *appColumn="'Name' of things; header: 'Name'; let row">{{
      row.name
    }}</ng-container>
  </app-data-table>`,
})
class PagedHost {
  pageSize = 25;
  readonly pages = new Map<string, Page<Row> | Error>([
    ['initial', { items: rows('Alpha', 'Beta'), next: 'c2' }],
    ['c2', { items: rows('Gamma'), next: '' }],
  ]);
  readonly things = pagedResource<object, Row>({
    params: () => ({}),
    loader: async (_p, cursor) => {
      const page = this.pages.get(cursor);
      if (!page) {
        throw new Error('no page ' + cursor);
      }
      if (page instanceof Error) {
        throw page;
      }
      return page;
    },
  });
}

describe('DataTable', () => {
  const settle = async (fixture: ComponentFixture<unknown>) => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const texts = (el: HTMLElement, selector: string) =>
    Array.from(el.querySelectorAll(selector)).map((e) => e.textContent?.trim());

  it('renders the projected columns and the rows, and reports a click', async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.rows.set(rows('Alpha', 'Beta'));
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    expect(texts(el, 'th')).toEqual(['Name', 'Size']);
    expect(texts(el, 'tr.mat-mdc-row')).toEqual(['Alpha10', 'Beta20']);
    expect(el.querySelector('td.primary')?.textContent?.trim()).toBe('Alpha');
    expect(el.querySelector('td.align-end')?.textContent?.trim()).toBe('10');
    expect(el.querySelector('table')?.getAttribute('aria-label')).toBe('Things');
    expect(el.querySelector('.table-count')?.textContent).toContain('2 loaded');
    expect(el.querySelector('.load-more')).toBeNull();

    el.querySelectorAll<HTMLElement>('tr.mat-mdc-row')[1].click();
    expect(host.clicked?.name).toBe('Beta');
    el.querySelectorAll<HTMLElement>('tr.mat-mdc-row')[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );
    expect(host.clicked?.name).toBe('Alpha');
  });

  it('shows the empty state with its action, the skeleton and the failure', async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state h3')?.textContent).toBe('No things');
    expect(el.querySelector('.empty-state a')?.textContent).toBe('Add a thing');
    expect(el.querySelector('table')?.classList.contains('hidden')).toBe(true);

    host.loading.set(true);
    await settle(fixture);
    expect(el.querySelectorAll('.skeleton-row')).toHaveLength(3);
    expect(el.querySelector('.empty-state')).toBeNull();

    host.loading.set(false);
    host.error.set(new RpcError('db down', 'UNAVAILABLE'));
    await settle(fixture);
    expect(el.querySelector('.table-error strong')?.textContent).toBe('The server did not answer');
    expect(el.querySelector('.table-error p')?.textContent).toBe('db down');
    el.querySelector<HTMLButtonElement>('.table-error button')?.click();
    expect(host.retries).toBe(1);
  });

  it('asks for the next page from the footer', async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.rows.set(rows('Alpha'));
    host.hasMore.set(true);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.table-count')?.textContent).toContain('more available');
    el.querySelector<HTMLButtonElement>('.load-more')?.click();
    expect(host.loads).toBe(1);

    host.loading.set(true);
    await settle(fixture);
    expect(el.querySelector<HTMLButtonElement>('.load-more')?.disabled).toBe(true);
    expect(el.querySelector('.load-more')?.textContent?.trim()).toBe('Loading…');
  });

  it('follows a paged resource: pages append, a failed page can be retried', async () => {
    const fixture = TestBed.createComponent(PagedHost);
    const host = fixture.componentInstance;
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(texts(el, 'tr.mat-mdc-row')).toEqual(['Alpha', 'Beta']);
    expect(el.querySelector('.page-size select')).not.toBeNull();

    host.pages.set('c2', new Error('offline'));
    el.querySelector<HTMLButtonElement>('.load-more')?.click();
    await settle(fixture);
    expect(texts(el, 'tr.mat-mdc-row')).toEqual(['Alpha', 'Beta']);
    expect(el.querySelector('.footer-error')?.textContent).toContain('Something went wrong');
    expect(el.querySelector('.load-more')?.textContent?.trim()).toBe('Try again');

    host.pages.set('c2', { items: rows('Gamma'), next: '' });
    el.querySelector<HTMLButtonElement>('.load-more')?.click();
    await settle(fixture);
    expect(texts(el, 'tr.mat-mdc-row')).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(el.querySelector('.footer-error')).toBeNull();
    expect(el.querySelector('.load-more')).toBeNull();

    const select = el.querySelector<HTMLSelectElement>('.page-size select');
    if (select) {
      select.value = '50';
      select.dispatchEvent(new Event('change'));
    }
    expect(host.pageSize).toBe(50);
  });
});
