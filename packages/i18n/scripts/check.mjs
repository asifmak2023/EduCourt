import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  codeFromFile,
  listJsonCatalogs,
  localesDir,
  readEnglish,
  validate,
} from "./catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = localesDir(root);

const english = readEnglish(dir);
const catalogs = listJsonCatalogs(dir).map((file) => {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const { $meta, ...messages } = raw;
  return { code: codeFromFile(file), meta: $meta, messages };
});

const { errors, warnings, missingByLocale } = validate(english, catalogs);

for (const warning of warnings) {
  console.log(`warn: ${warning}`);
}

for (const error of errors) {
  console.log(`error: ${error}`);
}

for (const code of Object.keys(missingByLocale)) {
  const missing = missingByLocale[code];
  if (missing.length) {
    console.log(`missing (${code}): ${missing.length} key(s) fall back to en`);
  } else {
    console.log(`missing (${code}): none`);
  }
}

if (errors.length) {
  console.log(`\n${errors.length} catalog error(s).`);
  process.exit(1);
}

console.log("\nCatalog validation passed.");
