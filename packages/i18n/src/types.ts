export interface LocaleMeta {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

/** Raw message map. Keys are flat, dot-notation, semantic. Plural variants use
 * category suffixes such as `students.count.one`. */
export type Messages = Record<string, string>;

/** A JSON locale catalog: display metadata plus a partial message map. The
 * `code` is supplied by the generator from the filename, not authored. */
export type LocaleCatalog = { $meta: Omit<LocaleMeta, "code"> } & Partial<Messages>;

export type TranslateParams = Record<string, string | number>;

export type TranslateFn<K extends string = string> = (
  key: K,
  params?: TranslateParams
) => string;

export interface StorageAdapter {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
}
