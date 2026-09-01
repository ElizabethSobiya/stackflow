import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageRequest } from '../../core/api/page-request';
import { PageResponse } from '../../core/models/api.models';
import { createPagedQuery } from './paged-query';

interface Criteria {
  search: string;
}

const DEBOUNCE_MS = 50;

function page(content: string[], pageIndex = 0): PageResponse<string> {
  return {
    content,
    page: pageIndex,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: pageIndex === 0,
    last: true,
  };
}

/**
 * The app is zoneless, so `fakeAsync` is unavailable: effects are flushed with `TestBed.tick()` and
 * the RxJS debounce is driven by Vitest's fake timers.
 */
describe('createPagedQuery', () => {
  let injector: Injector;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function build(fetcher: (criteria: Criteria, request: PageRequest) => Observable<PageResponse<string>>) {
    return runInInjectionContext(injector, () =>
      createPagedQuery(fetcher, { criteria: { search: '' }, debounceMs: DEBOUNCE_MS }, injector),
    );
  }

  function settle(ms = DEBOUNCE_MS + 10): void {
    TestBed.tick();
    vi.advanceTimersByTime(ms);
    TestBed.tick();
  }

  it('loads the first page on creation', () => {
    const query = build(() => of(page(['a', 'b'])));
    settle();

    expect(query.items()).toEqual(['a', 'b']);
    expect(query.loading()).toBe(false);
    expect(query.isEmpty()).toBe(false);
  });

  it('debounces rapid criteria changes into a single request', () => {
    const fetcher = vi.fn((_criteria: Criteria, _request: PageRequest) => of(page(['result'])));
    const query = build(fetcher);
    settle();
    expect(fetcher).toHaveBeenCalledTimes(1);

    query.setCriteria({ search: 'l' });
    settle(10);
    query.setCriteria({ search: 'la' });
    settle(10);
    query.setCriteria({ search: 'lap' });
    settle();

    // One request for the settled term, not one per keystroke.
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.at(-1)?.[0]).toEqual({ search: 'lap' });
  });

  it('returns to the first page when the filters change', () => {
    const query = build(() => of(page([])));
    settle();

    query.goToPage(3);
    settle();
    expect(query.page().page).toBe(3);

    query.setCriteria({ search: 'x' });
    settle();
    expect(query.page().page).toBe(0);
  });

  it('surfaces failures without wiping the last good page', () => {
    let shouldFail = false;
    const query = build(() => (shouldFail ? throwError(() => new Error('boom')) : of(page(['a']))));
    settle();
    expect(query.items()).toEqual(['a']);

    shouldFail = true;
    query.reload();
    settle();

    expect(query.error()).not.toBeNull();
    expect(query.items()).toEqual(['a']);
    expect(query.loading()).toBe(false);
  });

  it('reports emptiness for an empty page', () => {
    const query = build(() => of(page([])));
    settle();
    expect(query.isEmpty()).toBe(true);
  });
});
