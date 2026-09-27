"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "./api";
import type { AcademicOptions } from "./types";

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
