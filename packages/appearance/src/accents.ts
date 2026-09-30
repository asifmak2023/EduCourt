import type { AccentPreset } from "./types";

export const ACCENTS: AccentPreset[] = [
  { id: "indigo", label: "Indigo", accent: "#6366f1", accentForeground: "#ffffff" },
  { id: "violet", label: "Violet", accent: "#8b5cf6", accentForeground: "#ffffff" },
  { id: "fuchsia", label: "Fuchsia", accent: "#d946ef", accentForeground: "#ffffff" },
  { id: "rose", label: "Rose", accent: "#f43f5e", accentForeground: "#ffffff" },
  { id: "sky", label: "Sky", accent: "#0ea5e9", accentForeground: "#06283d" },
  { id: "teal", label: "Teal", accent: "#14b8a6", accentForeground: "#042f2e" },
  { id: "emerald", label: "Emerald", accent: "#10b981", accentForeground: "#052e1b" },
  { id: "amber", label: "Amber", accent: "#f59e0b", accentForeground: "#1f1300" },
];

export function findAccent(id: string): AccentPreset {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}
