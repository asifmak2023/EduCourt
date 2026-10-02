export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, "-");
}

/**
 * Resolve the best supported locale for a list of candidate tags.
 *
 * Order:
 *   1. exact tag match            (`en-us` -> `en-us`)
 *   2. language-region match      (`pt-pt` -> supported `pt-br` by primary tag)
 *   3. language-only match        (`ur-pk` -> supported `ur`)
 *   4. fallback locale
 */
export function pickBestLocale(
  supported: string[],
  candidates: string[],
  fallback = "en"
): string {
  const entries = supported.map((raw) => {
    const norm = normalizeTag(raw);
    const [lang, region] = norm.split("-");
    return { raw, norm, lang, region };
  });

  const normalized = candidates.map(normalizeTag).filter(Boolean);

  for (const candidate of normalized) {
    const match = entries.find((entry) => entry.norm === candidate);
    if (match) {
      return match.raw;
    }
  }

  for (const candidate of normalized) {
    const lang = candidate.split("-")[0];
    const match = entries.find((entry) => entry.lang === lang && entry.region);
    if (match) {
      return match.raw;
    }
  }

  for (const candidate of normalized) {
    const lang = candidate.split("-")[0];
    const match = entries.find((entry) => entry.lang === lang && !entry.region);
    if (match) {
      return match.raw;
    }
  }

  return fallback;
}
