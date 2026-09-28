"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "./api";
import type { AcademicOptions, ChartOfAccount, FiscalYear, Paginated } from "./types";

const EMPTY: AcademicOptions = {
  academic_years: [],
  class_rooms: [],
  sections: [],
};

export interface AcademicOptionsState {
  options: AcademicOptions;
  loading: boolean;
  error: string | null;
}

export function useAcademicOptions(enabled = true): AcademicOptionsState {
  const [options, setOptions] = useState<AcademicOptions>(EMPTY);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<{ data: AcademicOptions }>(
          "/v1/reference/academic-options",
          { signal: controller.signal }
        );

        if (!active) {
          return;
        }

        setOptions(response.data);
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load academic options."
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
  }, [enabled]);

  return { options, loading, error };
}

interface ListLookupState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

function useCollection<T>(path: string | null): ListLookupState<T> {
  const [items, setItems] = useState<T[]>([]);
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
        const response = await apiFetch<Paginated<T>>(path, {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setItems(response.data);
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }

        setError(
          err instanceof ApiError ? err.message : "Unable to load options."
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

  return { items, loading, error };
}

export function useChartOfAccounts(enabled = true): ListLookupState<ChartOfAccount> {
  return useCollection<ChartOfAccount>(
    enabled ? "/v1/chart-of-accounts?per_page=200" : null
  );
}

export function useFiscalYears(enabled = true): ListLookupState<FiscalYear> {
  return useCollection<FiscalYear>(enabled ? "/v1/fiscal-years?per_page=100" : null);
}
