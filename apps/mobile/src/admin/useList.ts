import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch } from "../lib/api";
import { useCampusId } from "../lib/campus";
import { buildQuery } from "./query";
import type { AdminRecord } from "./types";

export interface ListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface UseListOptions {
  endpoint: string;
  initialFilters?: Record<string, string | number | null>;
  perPage?: number;
  enabled?: boolean;
}

export interface UseListResult<T> {
  items: T[];
  meta: ListMeta | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  filters: Record<string, string | number | null>;
  setFilter: (param: string, value: string | number | null) => void;
  reload: () => void;
  loadMore: () => void;
}

interface LoadedPage<T> {
  key: string;
  items: T[];
  meta: ListMeta | null;
}

export function useList<T extends AdminRecord>(
  options: UseListOptions
): UseListResult<T> {
  const { endpoint, perPage = 25, enabled = true } = options;
  const campusId = useCampusId();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string | number | null>>(
    options.initialFilters ?? {}
  );
  const [nonce, setNonce] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState<LoadedPage<T>>({
    key: "",
    items: [],
    meta: null,
  });
  const [errorState, setErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const queryKey = `${endpoint}|${debouncedSearch}|${filterKey}|${campusId}`;

  const [pageState, setPageState] = useState<{ key: string; page: number }>(
    () => ({ key: queryKey, page: 1 })
  );
  const page = pageState.key === queryKey ? pageState.page : 1;
  const requestKey = `${queryKey}|${page}|${nonce}`;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    const isFirst = page === 1;

    const params: Record<string, string | number> = { page, per_page: perPage };
    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== "") {
        params[key] = value;
      }
    }

    apiFetch<{ data: T[]; meta: ListMeta }>(
      `${endpoint}${buildQuery(params)}`,
      { campusId }
    )
      .then((response) => {
        if (!active) {
          return;
        }
        setLoaded((previous) => ({
          key: requestKey,
          items: isFirst
            ? response.data
            : [...previous.items, ...response.data],
          meta: response.meta ?? null,
        }));
        setErrorState(null);
      })
      .catch((caught) => {
        if (active) {
          setErrorState({
            key: requestKey,
            message:
              caught instanceof ApiError
                ? caught.message
                : "Unable to load records.",
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoadingMore(false);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    endpoint,
    debouncedSearch,
    filterKey,
    campusId,
    page,
    nonce,
    enabled,
    perPage,
  ]);

  const loading = enabled && page === 1 && loaded.key !== requestKey;
  const error = errorState?.key === requestKey ? errorState.message : null;

  const setPage = useCallback(
    (next: number | ((current: number) => number)) => {
      setPageState((previous) => {
        const current = previous.key === queryKey ? previous.page : 1;
        const value = typeof next === "function" ? next(current) : next;
        return { key: queryKey, page: value };
      });
    },
    [queryKey]
  );

  const reload = useCallback(() => {
    setPage(1);
    setNonce((value) => value + 1);
  }, [setPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) {
      return;
    }
    if (loaded.meta && page >= loaded.meta.last_page) {
      return;
    }
    setLoadingMore(true);
    setPage((current) => current + 1);
  }, [loading, loadingMore, loaded.meta, page, setPage]);

  const setFilter = useCallback(
    (param: string, value: string | number | null) => {
      setFilters((previous) => ({ ...previous, [param]: value }));
    },
    []
  );

  return {
    items: loaded.items,
    meta: loaded.meta,
    loading,
    loadingMore,
    error,
    search,
    setSearch,
    filters,
    setFilter,
    reload,
    loadMore,
  };
}
