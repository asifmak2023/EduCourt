import type { BackgroundKind, GradientPreset, SolidPreset } from "./types";

export const SOLIDS: SolidPreset[] = [
  { id: "slate", label: "Slate", light: "#e2e8f0", dark: "#0f172a" },
  { id: "sand", label: "Sand", light: "#f7efe0", dark: "#1c1712" },
  { id: "mint", label: "Mint", light: "#e3f6ec", dark: "#071b13" },
  { id: "sky", label: "Sky", light: "#e3f1fd", dark: "#071827" },
  { id: "lavender", label: "Lavender", light: "#efeafb", dark: "#140f26" },
  { id: "blush", label: "Blush", light: "#fbeaf0", dark: "#210f18" },
];

export const GRADIENTS: GradientPreset[] = [
  {
    id: "aurora",
    label: "Aurora",
    light: ["#e0c3fc", "#8ec5fc"],
    dark: ["#12232e", "#1b3a4b", "#0b1a2a"],
  },
  {
    id: "ocean",
    label: "Ocean",
    light: ["#a1c4fd", "#c2e9fb"],
    dark: ["#02111f", "#0a3d62"],
  },
  {
    id: "sunset",
    label: "Sunset",
    light: ["#ffe29f", "#ffa99f"],
    dark: ["#3a1c71", "#7a1f4f"],
  },
  {
    id: "forest",
    label: "Forest",
    light: ["#d4fc79", "#96e6a1"],
    dark: ["#0b3d2e", "#134e4a"],
  },
];

export const DEFAULT_BACKGROUND_ID = "default";

export function backgroundKind(id: string): BackgroundKind {
  if (id === DEFAULT_BACKGROUND_ID) {
    return "default";
  }

  if (SOLIDS.some((solid) => solid.id === id)) {
    return "solid";
  }

  if (GRADIENTS.some((gradient) => gradient.id === id)) {
    return "gradient";
  }

  return "wallpaper";
}
