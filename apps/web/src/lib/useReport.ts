"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "./api";

export interface ReportState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useReport<T>(path: string | null): ReportState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

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
        const response = await apiFetch<{ data: T }>(path, {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setData(response.data);
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        setError(err instanceof ApiError ? err.message : "Unable to load report.");
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
  }, [path, version]);

  return {
    data,
    loading,
    error,
    reload: () => setVersion((current) => current + 1),
  };
}
