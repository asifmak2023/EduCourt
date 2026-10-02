export function getPath(source: unknown, path?: string): unknown {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((accumulator, part) => {
    if (accumulator === null || accumulator === undefined || typeof accumulator !== "object") {
      return undefined;
    }
    return (accumulator as Record<string, unknown>)[part];
  }, source);
}
