import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { PagedResource } from '../../core/api/paged-resource';

export interface ColumnContext<T> {
  $implicit: T;
  index: number;
}

/**
 * A column of app-data-table: the template of its cells, with the row as
 * the implicit variable. `of` names the rows (the array or the paged
 * resource the table shows) so the row is typed in the template:
 *
 *   <ng-container *appColumn="'Name'; of: projects(); header: 'Name'; let row">
 *     {{ row.Name }}
 *   </ng-container>
 */
@Directive({ selector: '[appColumn]' })
export class ColumnDef<T> {
  /** The column name, unique in the table */
  readonly name = input.required<string>({ alias: 'appColumn' });
  /** The rows of the table, for the type of the row */
  readonly of = input.required<readonly T[] | PagedResource<T> | undefined>({
    alias: 'appColumnOf',
  });
  readonly header = input('', { alias: 'appColumnHeader' });
  readonly align = input<'start' | 'end'>('start', { alias: 'appColumnAlign' });
  /** A CSS width for the column; the others share the rest */
  readonly width = input('', { alias: 'appColumnWidth' });
  /** True for the column that identifies the row: stronger text */
  readonly primary = input(false, { alias: 'appColumnPrimary' });
  readonly template = inject<TemplateRef<ColumnContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(dir: ColumnDef<T>, ctx: unknown): ctx is ColumnContext<T> {
    void dir;
    void ctx;
    return true;
  }
}
