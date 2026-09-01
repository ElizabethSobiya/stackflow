import { DestroyRef, Injector, Signal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { PageRequest, pageRequest } from '../../core/api/page-request';
import { PageResponse } from '../../core/models/api.models';
import { toMessage } from '../../core/interceptors/error.interceptor';

export interface PagedQueryOptions<C> {
  /** Initial filter state. */
  criteria: C;
  /** Initial page/size/sort. */
  page?: Partial<PageRequest>;
  /** Debounce before hitting the API — keeps a typing user from firing a request per keystroke. */
  debounceMs?: number;
}

export interface PagedQuery<C, T> {
  readonly criteria: Signal<C>;
  readonly page: Signal<PageRequest>;
  readonly result: Signal<PageResponse<T> | null>;
  readonly items: Signal<T[]>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly isEmpty: Signal<boolean>;
  /** Merges a partial filter change and returns to page 0. */
  setCriteria(patch: Partial<C>): void;
  resetCriteria(): void;
  goToPage(page: number): void;
  setSort(sort: string, direction: 'asc' | 'desc'): void;
  setPageSize(size: number): void;
  reload(): void;
}

/**
 * The list-screen engine, written once and reused by products, orders and stock.
 *
 * <p>Filters and pagination are signals; changes are piped through `debounceTime` and `switchMap`
 * so a fast typist cancels their own in-flight request instead of racing it, and every list gets
 * loading/error/empty states without repeating the wiring. Server-side paging is the only mode
 * offered — there is deliberately no "fetch everything and slice in the browser" path.
 *
 * <p>Must be called from an injection context (a component field or a factory), because it hooks
 * into the caller's lifecycle to unsubscribe.
 */
export function createPagedQuery<C extends object, T>(
  fetcher: (criteria: C, page: PageRequest) => Observable<PageResponse<T>>,
  options: PagedQueryOptions<C>,
  injector?: Injector,
): PagedQuery<C, T> {
  const destroyRef = injector ? injector.get(DestroyRef) : inject(DestroyRef);
  const initialCriteria = { ...options.criteria };

  const criteria = signal<C>(initialCriteria);
  const page = signal<PageRequest>(pageRequest(options.page));
  const result = signal<PageResponse<T> | null>(null);
  const loading = signal(false);
  const error = signal<string | null>(null);
  const reloadTick = signal(0);

  const request = computed(() => ({
    criteria: criteria(),
    page: page(),
    tick: reloadTick(),
  }));

  toObservable(request, injector ? { injector } : undefined)
    .pipe(
      debounceTime(options.debounceMs ?? 250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      tap(() => {
        loading.set(true);
        error.set(null);
      }),
      switchMap(({ criteria: currentCriteria, page: currentPage }) =>
        fetcher(currentCriteria, currentPage).pipe(
          catchError((failure: unknown) => {
            error.set(toMessage(failure, 'Could not load this list.'));
            return of(null);
          }),
        ),
      ),
      tap(() => loading.set(false)),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe((response) => {
      if (response) {
        result.set(response);
      }
    });

  return {
    criteria: criteria.asReadonly(),
    page: page.asReadonly(),
    result: result.asReadonly(),
    items: computed(() => result()?.content ?? []),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    isEmpty: computed(() => !loading() && (result()?.content.length ?? 0) === 0),
    setCriteria: (patch) => {
      criteria.update((current) => ({ ...current, ...patch }));
      page.update((current) => ({ ...current, page: 0 }));
    },
    resetCriteria: () => {
      criteria.set({ ...initialCriteria });
      page.update((current) => ({ ...current, page: 0 }));
    },
    goToPage: (next) => page.update((current) => ({ ...current, page: Math.max(0, next) })),
    setSort: (sort, direction) => page.update((current) => ({ ...current, sort, direction, page: 0 })),
    setPageSize: (size) => page.update((current) => ({ ...current, size, page: 0 })),
    reload: () => reloadTick.update((tick) => tick + 1),
  };
}
