"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "./api";

export interface JsonState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useJson<T>(path: string | null): JsonState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (path === null) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<T>(path, { signal: controller.signal });
        if (active) {
          setData(response);
        }
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Unable to load data."
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
  }, [path]);

  return { data, loading, error };
}
