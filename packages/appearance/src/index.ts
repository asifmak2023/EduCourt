export * from "./types";
export * from "./accents";
export * from "./backgrounds";
export * from "./wallpapers";

import { ACCENTS, findAccent } from "./accents";
import { GRADIENTS, SOLIDS, backgroundKind } from "./backgrounds";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  type AppearanceConfig,
} from "./types";
import { findWallpaper } from "./wallpapers";

export interface ResolvedBackground {
  kind: "default" | "solid" | "gradient" | "wallpaper";
  color?: string;
  colors?: string[];
  imageUrl?: string;
  thumbUrl?: string;
}

export function resolveBackground(
  id: string,
  mode: "light" | "dark"
): ResolvedBackground {
  const kind = backgroundKind(id);

  if (kind === "solid") {
    const solid = SOLIDS.find((entry) => entry.id === id);
    return { kind, color: mode === "dark" ? solid?.dark : solid?.light };
  }

  if (kind === "gradient") {
    const gradient = GRADIENTS.find((entry) => entry.id === id);
    return { kind, colors: mode === "dark" ? gradient?.dark : gradient?.light };
  }

  if (kind === "wallpaper") {
    const wallpaper = findWallpaper(id);
    return {
      kind,
      imageUrl: wallpaper?.fullUrl,
      thumbUrl: wallpaper?.thumbUrl,
    };
  }

  return { kind: "default" };
}

export function normalizeAppearance(value: unknown): AppearanceConfig {
  const stored =
    value && typeof value === "object" ? (value as Partial<AppearanceConfig>) : {};

  const mode =
    stored.mode === "light" || stored.mode === "dark" || stored.mode === "system"
      ? stored.mode
      : DEFAULT_APPEARANCE.mode;

  const accentId = ACCENTS.some((accent) => accent.id === stored.accentId)
    ? (stored.accentId as string)
    : DEFAULT_APPEARANCE.accentId;

  const dim =
    typeof stored.wallpaperDim === "number" && Number.isFinite(stored.wallpaperDim)
      ? Math.min(80, Math.max(0, stored.wallpaperDim))
      : DEFAULT_APPEARANCE.wallpaperDim;

  return {
    mode,
    accentId,
    vibrant:
      typeof stored.vibrant === "boolean"
        ? stored.vibrant
        : DEFAULT_APPEARANCE.vibrant,
    backgroundId:
      typeof stored.backgroundId === "string" && stored.backgroundId
        ? stored.backgroundId
        : DEFAULT_APPEARANCE.backgroundId,
    wallpaperDim: dim,
    animations:
      typeof stored.animations === "boolean"
        ? stored.animations
        : DEFAULT_APPEARANCE.animations,
  };
}

export { APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE, findAccent };
export type { AppearanceConfig };
