"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

/**
 * Fetches the next suggested code for a resource. The value stays editable, so
 * users can override the suggestion before saving.
 */
export function useSuggestedCode({
  endpoint,
  enabled = true,
  column = "code",
  initialValue = "",
}: {
  endpoint: string;
  enabled?: boolean;
  column?: string;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    void apiFetch<{ data: Record<string, string> }>(`${endpoint}/next-code`, {
      signal: controller.signal,
    })
      .then((response) => {
        const suggested = response.data?.[column];
        if (active && suggested) {
          setValue((current) => current || suggested);
        }
      })
      .catch(() => {
        // A code is optional; the API generates one when it is left blank.
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [column, enabled, endpoint]);

  return [value, setValue] as const;
}
