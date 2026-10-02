import { useCallback } from "react";
import { apiFetch } from "../lib/api";
import { useCampusId } from "../lib/campus";
import { useAsync } from "../lib/useAsync";
import type { AdminRecord } from "./types";

export function useResource<T extends AdminRecord>(
  endpoint: string | null,
  id?: number | string | null
) {
  const campusId = useCampusId();
  const enabled = Boolean(endpoint && id !== null && id !== undefined);

  const loader = useCallback(async () => {
    if (!endpoint || id === null || id === undefined) {
      throw new Error("Missing resource id.");
    }
    const response = await apiFetch<{ data: T }>(`${endpoint}/${id}`, {
      campusId,
    });
    return response.data;
  }, [endpoint, id, campusId]);

  return useAsync<T>(enabled ? loader : null, [endpoint, id, campusId]);
}
