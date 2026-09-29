"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "./api";
import type { Paginated } from "./types";

export interface ListState<T> {
  items: T[];
  meta: Paginated<T>["meta"] | null;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (search: string) => void;
  reload: () => void;
}

export function useList<T>(
  basePath: string,
  params: Record<string, string | number> = {}
): ListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<Paginated<T>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [nonce, setNonce] = useState(0);

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      const query = new URLSearchParams();
      query.set("page", String(page));

      if (search.trim() !== "") {
        query.set("search", search.trim());
      }

      for (const [key, value] of Object.entries(
        JSON.parse(paramsKey) as Record<string, string | number>
      )) {
        query.set(key, String(value));
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<Paginated<T>>(
          `${basePath}?${query.toString()}`,
          { signal: controller.signal }
        );

        if (!active) {
          return;
        }

        setItems(response.data);
        setMeta(response.meta);
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        setError(
          err instanceof ApiError ? err.message : "Unable to load records."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [basePath, page, search, paramsKey, nonce]);

  const reload = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  return {
    items,
    meta,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    reload,
  };
}
