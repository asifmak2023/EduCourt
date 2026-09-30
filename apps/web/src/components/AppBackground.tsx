"use client";

import { useAppearance } from "@/lib/appearance";

export function AppBackground() {
  const { config, resolvedMode, background } = useAppearance();

  if (background.kind === "default") {
    return null;
  }

  const dim = config.wallpaperDim / 100;
  const fallback = resolvedMode === "dark" ? "#0b1120" : "#e2e8f0";

  const style: React.CSSProperties = { backgroundColor: fallback };

  if (background.kind === "solid" && background.color) {
    style.background = background.color;
  } else if (background.kind === "gradient" && background.colors) {
    style.backgroundImage = `linear-gradient(135deg, ${background.colors.join(", ")})`;
  } else if (background.kind === "wallpaper" && background.imageUrl) {
    style.backgroundImage = `url("${background.imageUrl}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
    style.backgroundAttachment = "fixed";
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={style}
      />
      {background.kind === "wallpaper" && dim > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
          style={{ backgroundColor: `rgba(0, 0, 0, ${dim})` }}
        />
      ) : null}
    </>
  );
}
