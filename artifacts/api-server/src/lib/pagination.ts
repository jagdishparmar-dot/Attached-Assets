export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PaginationQuery = {
  page: number;
  pageSize: number;
  offset: number;
  paginate: boolean;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** Parse page/pageSize from Express query. If `page` is present, paginate=true. */
export function parsePagination(query: Record<string, unknown>, defaults?: {
  pageSize?: number;
  /** Force pagination even without page param (admin list endpoints) */
  force?: boolean;
}): PaginationQuery {
  const defaultSize = defaults?.pageSize ?? DEFAULT_PAGE_SIZE;
  const force = defaults?.force ?? false;
  const rawPage = query.page;
  const rawSize = query.pageSize ?? query.limit;

  const paginate = force || rawPage !== undefined || rawSize !== undefined;
  const page = Math.max(1, parseInt(String(rawPage ?? "1"), 10) || 1);
  let pageSize = parseInt(String(rawSize ?? defaultSize), 10) || defaultSize;
  pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset, paginate };
}

export function paginateArray<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function toPaginated<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
