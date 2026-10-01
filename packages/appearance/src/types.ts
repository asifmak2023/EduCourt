export type ColorMode = "system" | "light" | "dark";

export type BackgroundKind = "default" | "solid" | "gradient" | "wallpaper";

export interface AccentPreset {
  id: string;
  label: string;
  accent: string;
  accentForeground: string;
}

export interface SolidPreset {
  id: string;
  label: string;
  light: string;
  dark: string;
}

export interface GradientPreset {
  id: string;
  label: string;
  light: string[];
  dark: string[];
}

export interface WallpaperPreset {
  id: string;
  label: string;
  category: string;
  thumbUrl: string;
  fullUrl: string;
  photographer: string;
  attributionUrl: string;
}

export interface AppearanceConfig {
  mode: ColorMode;
  accentId: string;
  vibrant: boolean;
  backgroundId: string;
  wallpaperDim: number;
  animations: boolean;
  glass: boolean;
  glassBlur: number;
  glassTransparency: number;
  backgroundBlur: number;
}

export const APPEARANCE_STORAGE_KEY = "eis.appearance";

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  mode: "system",
  accentId: "indigo",
  vibrant: true,
  backgroundId: "default",
  wallpaperDim: 0,
  animations: true,
  glass: false,
  glassBlur: 12,
  glassTransparency: 45,
  backgroundBlur: 0,
};

export const GLASS_BLUR_MAX = 24;
export const GLASS_TRANSPARENCY_MAX = 100;
export const BACKGROUND_BLUR_MAX = 24;

export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}
