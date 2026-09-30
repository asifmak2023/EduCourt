import type { WallpaperPreset } from "./types";

function pexels(id: number, width: number): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

function wall(entry: {
  id: number;
  label: string;
  category: string;
}): WallpaperPreset {
  const { id, label, category } = entry;

  return {
    id: `pexels-${id}`,
    label,
    category,
    thumbUrl: pexels(id, 400),
    fullUrl: pexels(id, 1920),
    photographer: "Pexels",
    attributionUrl: `https://www.pexels.com/photo/${id}/`,
  };
}

export const WALLPAPERS: WallpaperPreset[] = [
  wall({ id: 417074, label: "Moraine Lake", category: "Nature" }),
  wall({ id: 210186, label: "Seljalandsfoss", category: "Nature" }),
  wall({ id: 1287145, label: "Alpine Moon", category: "Nature" }),
  wall({ id: 355465, label: "Milky Way", category: "Space" }),
  wall({ id: 268533, label: "Still Water", category: "Minimal" }),
  wall({ id: 325185, label: "Snowfield", category: "Minimal" }),
  wall({ id: 1103970, label: "Blue Wave", category: "Abstract" }),
  wall({ id: 1616403, label: "Color Drift", category: "Abstract" }),
  wall({ id: 255379, label: "Bokeh Lights", category: "Abstract" }),
  wall({ id: 323780, label: "Modern Home", category: "Architecture" }),
  wall({ id: 421927, label: "City Dusk", category: "Architecture" }),
  wall({ id: 442574, label: "Study Desk", category: "Workspace" }),
];

export function findWallpaper(id: string): WallpaperPreset | undefined {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id);
}
