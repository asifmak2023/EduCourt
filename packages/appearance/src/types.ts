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
}

export const APPEARANCE_STORAGE_KEY = "eis.appearance";

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  mode: "system",
  accentId: "indigo",
  vibrant: true,
  backgroundId: "default",
  wallpaperDim: 0,
  animations: true,
};
