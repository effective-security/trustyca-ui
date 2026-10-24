import { Injector, Signal, computed, effect, inject, signal, untracked } from '@angular/core';

/** The first cursor of a list request */
export const INITIAL_CURSOR = 'initial';

/** One page of a list: its items and the cursor of the next page, '' at the end */
export interface Page<T> {
  readonly items: readonly T[];
  readonly next: string;
}

export interface PagedResourceOptions<P, T> {
  /** The request without the cursor; undefined keeps the resource idle */
  params: () => P | undefined;
  /** Loads the page at the cursor, INITIAL_CURSOR for the first one */
  loader: (params: P, cursor: string) => Promise<Page<T>>;
  injector?: Injector;
}

export interface PagedResource<T> {
  readonly items: Signal<readonly T[]>;
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<unknown>;
  readonly hasMore: Signal<boolean>;
  /** Appends the next page */
  loadMore(): void;
  /** Starts again from the first page */
  reload(): void;
}

/**
 * Cursor paging over a list RPC: the pages accumulate until the params
 * change, which starts again from the first page. The answer of a page
 * requested for older params is dropped.
 */
export function pagedResource<P, T>(options: PagedResourceOptions<P, T>): PagedResource<T> {
  const injector = options.injector ?? inject(Injector);
  const items = signal<readonly T[]>([]);
  const next = signal('');
  const isLoading = signal(false);
  const error = signal<unknown>(undefined);
  const params = computed(options.params);
  let generation = 0;

  const fetchPage = async (p: P, cursor: string, gen: number) => {
    isLoading.set(true);
    try {
      const page = await options.loader(p, cursor);
      if (gen === generation) {
        items.update((current) => [...current, ...page.items]);
        next.set(page.next);
        // a retry of loadMore that succeeds clears the failure before it
        error.set(undefined);
      }
    } catch (err) {
      if (gen === generation) {
        error.set(err);
      }
    } finally {
      if (gen === generation) {
        isLoading.set(false);
      }
    }
  };

  const start = (p: P | undefined) => {
    const gen = ++generation;
    items.set([]);
    next.set('');
    error.set(undefined);
    isLoading.set(false);
    if (p !== undefined) {
      void fetchPage(p, INITIAL_CURSOR, gen);
    }
  };

  effect(
    () => {
      const p = params();
      untracked(() => start(p));
    },
    { injector },
  );

  return {
    items: items.asReadonly(),
    isLoading: isLoading.asReadonly(),
    error: error.asReadonly(),
    hasMore: computed(() => next() !== ''),
    loadMore: () => {
      const p = untracked(params);
      if (p !== undefined && next() && !isLoading()) {
        void fetchPage(p, next(), generation);
      }
    },
    reload: () => start(untracked(params)),
  };
}
