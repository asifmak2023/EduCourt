export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  foreground: string;
  muted: string;
  danger: string;
  success: string;
  accent: string;
  accentForeground: string;
  accentSoft: string;
}

const LIGHT = {
  background: "#f4f5f8",
  surface: "#ffffff",
  surfaceSecondary: "#eef0f4",
  border: "#e0e3ea",
  foreground: "#1a1c22",
  muted: "#667085",
  danger: "#dc2626",
  success: "#16a34a",
};

const DARK = {
  background: "#0b0d12",
  surface: "#171a21",
  surfaceSecondary: "#20242e",
  border: "#2b303b",
  foreground: "#f3f4f6",
  muted: "#98a2b3",
  danger: "#f87171",
  success: "#4ade80",
};

function channel(value: string): number {
  const parsed = parseInt(value, 16);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "").slice(0, 6);
  const clamped = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return `#${clean}${clamped.toString(16).padStart(2, "0")}`;
}

export function mix(base: string, tint: string, amount: number): string {
  const a = base.replace("#", "").slice(0, 6);
  const b = tint.replace("#", "").slice(0, 6);
  const ratio = Math.max(0, Math.min(1, amount));

  const channels = [0, 2, 4].map((offset) =>
    Math.round(channel(a.slice(offset, offset + 2)) * (1 - ratio) + channel(b.slice(offset, offset + 2)) * ratio)
  );

  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function buildColors(
  mode: "light" | "dark",
  accent: string,
  accentForeground: string,
  vibrant: boolean
): ThemeColors {
  const base = mode === "dark" ? DARK : LIGHT;
  const tintedSurface = vibrant
    ? mix(base.surface, accent, mode === "dark" ? 0.1 : 0.05)
    : base.surface;
  const tintedBackground = vibrant
    ? mix(base.background, accent, mode === "dark" ? 0.08 : 0.04)
    : base.background;

  return {
    ...base,
    surface: tintedSurface,
    background: tintedBackground,
    accent,
    accentForeground,
    accentSoft: withAlpha(accent, mode === "dark" ? 0.26 : 0.14),
  };
}
