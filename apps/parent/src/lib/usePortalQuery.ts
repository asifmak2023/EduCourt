"use client";

import { useEffect, useState } from "react";
import { ApiError } from "./api";

export function usePortalQuery<T>(
  childId: number | null,
  load: (id: number | null) => Promise<T>,
  ready: boolean
): { data: T | null; loading: boolean; error: string | null } {
  const key = `${ready ? "ready" : "idle"}:${childId ?? "self"}`;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string | null;
  }>({ key: "", data: null, error: null });

  useEffect(() => {
    if (!ready) {
      return;
    }

    let active = true;

    load(childId)
      .then((result) => {
        if (active) {
          setState({ key, data: result, error: null });
        }
      })
      .catch((err) => {
        if (active) {
          setState({
            key,
            data: null,
            error:
              err instanceof ApiError
                ? err.message
                : "Something went wrong. Please try again.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [key, ready, childId, load]);

  const settled = state.key === key;

  return {
    data: settled ? state.data : null,
    loading: !ready || !settled,
    error: settled ? state.error : null,
  };
}
