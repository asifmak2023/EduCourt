import type { StorageAdapter } from "./types";

export function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();

  return {
    get(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    set(key, value) {
      map.set(key, value);
    },
  };
}
