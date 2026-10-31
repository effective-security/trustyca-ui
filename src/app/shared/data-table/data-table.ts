import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  model,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { toUiError } from '../../core/api/errors';
import type { PagedResource } from '../../core/api/paged-resource';
import { EmptyState } from '../empty-state/empty-state';
import { Icon, IconName } from '../icon/icon';
import { ColumnDef } from './column';

export type TableState = 'rows' | 'loading' | 'error' | 'empty';

/** The page sizes a list offers */
export const PAGE_SIZES: readonly number[] = [25, 50, 100];

/**
 * The list table of the console (DESIGN.md section 11): the columns come
 * from the projected `*appColumn` templates, the rows from `rows` or from a
 * `PagedResource` (which also drives loading, failure and "Load more"),
 * with the loading, empty and error states of every list page.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, MatButtonModule, MatTableModule, EmptyState, Icon],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T> {
  /** The rows, when the page drives the table itself */
  readonly rows = input<readonly T[]>();
  /** The paged list, when the table follows a cursor-paged RPC */
  readonly paged = input<PagedResource<T>>();
  readonly loading = input(false);
  readonly error = input<unknown>(undefined);
  readonly hasMore = input(false);
  /** The identity of a row, for the rendering of a changed page */
  readonly rowId = input<(row: T) => string>();
  /** True when a row opens something: hover, focus and `rowClick` */
  readonly clickable = input(false);
  /** The accessible name of the table */
  readonly label = input('');
  readonly emptyIcon = input<IconName>('layers');
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyDescription = input('');
  /** The page size, when the footer offers one */
  readonly pageSize = model<number | undefined>(undefined);
  readonly pageSizes = input<readonly number[]>(PAGE_SIZES);

  readonly loadMore = output<void>();
  readonly retry = output<void>();
  readonly rowClick = output<T>();

  private readonly columnDefs = contentChildren(ColumnDef);
  protected readonly columns = computed(() => this.columnDefs());
  protected readonly columnNames = computed(() => this.columns().map((c) => c.name()));
  protected readonly items = computed<readonly T[]>(
    () => this.paged()?.items() ?? this.rows() ?? [],
  );
  protected readonly isLoading = computed(() => this.paged()?.isLoading() ?? this.loading());
  protected readonly more = computed(() => this.paged()?.hasMore() ?? this.hasMore());
  protected readonly uiError = computed(() => {
    const err = this.paged()?.error() ?? this.error();
    return err === undefined || err === null ? undefined : toUiError(err);
  });
  protected readonly state = computed<TableState>(() => {
    if (this.items().length > 0) {
      return 'rows';
    }
    if (this.uiError()) {
      return 'error';
    }
    return this.isLoading() ? 'loading' : 'empty';
  });
  protected readonly skeletonRows = [0, 1, 2];

  protected readonly trackBy = (_index: number, row: T): unknown => this.rowId()?.(row) ?? row;

  /** Asks for the next page */
  protected next(): void {
    this.paged()?.loadMore();
    this.loadMore.emit();
  }

  /** Tries the failed request again: the first page, or the next one */
  protected tryAgain(): void {
    const paged = this.paged();
    if (paged) {
      if (this.items().length > 0) {
        paged.loadMore();
      } else {
        paged.reload();
      }
    }
    this.retry.emit();
  }

  protected onRow(row: T): void {
    if (this.clickable()) {
      this.rowClick.emit(row);
    }
  }

  protected onRowKey(event: KeyboardEvent, row: T): void {
    if (this.clickable() && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.rowClick.emit(row);
    }
  }

  protected setPageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
  }
}
