import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { INITIAL_CURSOR, Page, pagedResource } from './paged-resource';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r));

describe('pagedResource', () => {
  let calls: { params: string; cursor: string; d: Deferred<Page<number>> }[];
  const loader = (params: string, cursor: string) => {
    const d = deferred<Page<number>>();
    calls.push({ params, cursor, d });
    return d.promise;
  };

  beforeEach(() => {
    calls = [];
  });

  it('loads the first page, appends the next ones and stops at the end', async () => {
    const params = signal<string | undefined>('active');
    const res = pagedResource({ params, loader, injector: TestBed.inject(Injector) });
    TestBed.tick();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ params: 'active', cursor: INITIAL_CURSOR });
    expect(res.isLoading()).toBe(true);

    calls[0].d.resolve({ items: [1, 2], next: 'c2' });
    await flush();
    expect(res.items()).toEqual([1, 2]);
    expect(res.hasMore()).toBe(true);
    expect(res.isLoading()).toBe(false);

    res.loadMore();
    res.loadMore();
    expect(calls).toHaveLength(2);
    expect(calls[1].cursor).toBe('c2');
    calls[1].d.resolve({ items: [3], next: '' });
    await flush();
    expect(res.items()).toEqual([1, 2, 3]);
    expect(res.hasMore()).toBe(false);
    res.loadMore();
    expect(calls).toHaveLength(2);
  });

  it('starts again when the params change and drops the answer for the old ones', async () => {
    const params = signal<string | undefined>('a');
    const res = pagedResource({ params, loader, injector: TestBed.inject(Injector) });
    TestBed.tick();
    params.set('b');
    TestBed.tick();
    expect(calls.map((c) => c.params)).toEqual(['a', 'b']);

    calls[1].d.resolve({ items: [20], next: '' });
    calls[0].d.resolve({ items: [10], next: 'x' });
    await flush();
    expect(res.items()).toEqual([20]);
    expect(res.hasMore()).toBe(false);
  });

  it('clears the failure of a next page when its retry succeeds', async () => {
    const params = signal<string | undefined>('a');
    const res = pagedResource({ params, loader, injector: TestBed.inject(Injector) });
    TestBed.tick();
    calls[0].d.resolve({ items: [1], next: 'c2' });
    await flush();

    res.loadMore();
    calls[1].d.reject(new Error('offline'));
    await flush();
    expect((res.error() as Error).message).toBe('offline');
    expect(res.hasMore()).toBe(true);

    res.loadMore();
    expect(calls[2].cursor).toBe('c2');
    calls[2].d.resolve({ items: [2], next: '' });
    await flush();
    expect(res.error()).toBeUndefined();
    expect(res.items()).toEqual([1, 2]);
    expect(res.hasMore()).toBe(false);
  });

  it('stays idle without params, keeps the error and reloads', async () => {
    const params = signal<string | undefined>(undefined);
    const res = pagedResource({ params, loader, injector: TestBed.inject(Injector) });
    TestBed.tick();
    expect(calls).toHaveLength(0);

    params.set('a');
    TestBed.tick();
    calls[0].d.reject(new Error('offline'));
    await flush();
    expect((res.error() as Error).message).toBe('offline');
    expect(res.isLoading()).toBe(false);

    res.reload();
    expect(res.error()).toBeUndefined();
    expect(calls).toHaveLength(2);
    calls[1].d.resolve({ items: [1], next: '' });
    await flush();
    expect(res.items()).toEqual([1]);
  });
});
