import React from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  [key: string]: string | number | undefined | null;
};

function buildUrl(path: string, params: ListQuery): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Fetch a paginated list endpoint that returns { items, total, page, pageSize, totalPages }.
 * Falls back if the API still returns a bare array.
 */
export function usePaginatedQuery<T>(
  key: string,
  path: string,
  params: ListQuery,
  options?: { enabled?: boolean; staleTime?: number },
) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;

  return useQuery({
    queryKey: [key, params],
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
    queryFn: async (): Promise<PaginatedResult<T>> => {
      const data = await customFetch<PaginatedResult<T> | T[]>(
        buildUrl(path, { ...params, page, pageSize }),
      );

      if (Array.isArray(data)) {
        const total = data.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const offset = (page - 1) * pageSize;
        return {
          items: data.slice(offset, offset + pageSize),
          total,
          page,
          pageSize,
          totalPages,
        } as PaginatedResult<T> & Record<string, unknown>;
      }

      return data as PaginatedResult<T> & Record<string, unknown>;
    },
  });
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
