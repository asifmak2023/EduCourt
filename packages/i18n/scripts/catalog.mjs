import fs from "node:fs";
import path from "node:path";

export const PLURAL_CATEGORIES = ["zero", "one", "two", "few", "many", "other"];

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)*$/;
const PLACEHOLDER_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export function localesDir(root) {
  return path.join(root, "src", "locales");
}

/** Read en.ts (the schema) as a plain object. en.ts must contain only the
 * `export const en = { ... } as const;` object literal. */
export function readEnglish(dir) {
  const file = path.join(dir, "en.ts");
  const source = fs.readFileSync(file, "utf8");
  const body = source
    .replace(/export\s+const\s+en\s*=/, "const en =")
    .replace(/as\s+const/g, "");

  const factory = new Function(`${body}\nreturn en;`);
  return factory();
}

export function baseKeyOf(key) {
  const parts = key.split(".");
  const last = parts[parts.length - 1];
  if (PLURAL_CATEGORIES.includes(last) && parts.length > 1) {
    return parts.slice(0, -1).join(".");
  }
  return key;
}

export function extractPlaceholders(template) {
  const names = new Set();
  let match;
  PLACEHOLDER_PATTERN.lastIndex = 0;
  while ((match = PLACEHOLDER_PATTERN.exec(template)) !== null) {
    names.add(match[1]);
  }
  return names;
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

export function listJsonCatalogs(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

export function codeFromFile(file) {
  return file.replace(/\.json$/, "");
}

export function identifier(code) {
  const name = code.replace(/[^A-Za-z0-9]/g, "_");
  return /^[0-9]/.test(name) ? `_${name}` : name;
}

/**
 * Validate catalogs against the English schema.
 * Returns { errors: string[], warnings: string[], missingByLocale }.
 */
export function validate(english, catalogs) {
  const errors = [];
  const warnings = [];
  const missingByLocale = {};

  const englishKeys = Object.keys(english);

  for (const key of englishKeys) {
    if (!KEY_PATTERN.test(key)) {
      errors.push(`en: invalid key "${key}"`);
    }
    if (typeof english[key] !== "string") {
      errors.push(`en: value for "${key}" must be a string`);
    }
  }

  for (const { code, meta, messages } of catalogs) {
    if (!meta || typeof meta !== "object") {
      errors.push(`${code}: missing "$meta" object`);
      continue;
    }
    if (typeof meta.name !== "string" || !meta.name) {
      errors.push(`${code}: $meta.name is required`);
    }
    if (typeof meta.nativeName !== "string" || !meta.nativeName) {
      errors.push(`${code}: $meta.nativeName is required`);
    }
    if (meta.dir !== "ltr" && meta.dir !== "rtl") {
      errors.push(`${code}: $meta.dir must be "ltr" or "rtl"`);
    }

    const missing = [];
    for (const key of Object.keys(messages)) {
      if (key === "$meta") continue;
      if (!englishKeys.includes(key)) {
        errors.push(`${code}: unknown key "${key}"`);
        continue;
      }
      const expected = extractPlaceholders(english[key]);
      const actual = extractPlaceholders(messages[key]);
      if (!sameSet(expected, actual)) {
        errors.push(
          `${code}: placeholder mismatch for "${key}" ` +
            `(expected {${[...expected].join(", ")}}, got {${[...actual].join(", ")}})`
        );
      }
    }

    for (const key of englishKeys) {
      if (!(key in messages)) {
        missing.push(key);
      }
    }
    missingByLocale[code] = missing;
  }

  return { errors, warnings, missingByLocale };
}
