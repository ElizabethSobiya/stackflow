/** Pagination and sorting, in the shape Spring Data's `Pageable` binder expects. */
export interface PageRequest {
  page: number;
  size: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export const DEFAULT_PAGE_SIZE = 20;

export function pageRequest(overrides: Partial<PageRequest> = {}): PageRequest {
  return { page: 0, size: DEFAULT_PAGE_SIZE, ...overrides };
}

export function pageParams(request: PageRequest): Record<string, string | number> {
  const params: Record<string, string | number> = { page: request.page, size: request.size };
  if (request.sort) {
    params['sort'] = `${request.sort},${request.direction ?? 'desc'}`;
  }
  return params;
}
