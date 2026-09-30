"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  ACCENTS,
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  findAccent,
  normalizeAppearance,
  resolveBackground,
  type AccentPreset,
  type AppearanceConfig,
  type ColorMode,
  type ResolvedBackground,
} from "@eis/appearance";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedConfig: AppearanceConfig = DEFAULT_APPEARANCE;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): AppearanceConfig {
  const raw = readRaw();

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedConfig = raw
        ? normalizeAppearance(JSON.parse(raw))
        : DEFAULT_APPEARANCE;
    } catch {
      cachedConfig = DEFAULT_APPEARANCE;
    }
  }

  return cachedConfig;
}

function getServerSnapshot(): AppearanceConfig {
  return DEFAULT_APPEARANCE;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function write(config: AppearanceConfig): void {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage write failures.
  }
  cachedRaw = undefined;
  listeners.forEach((listener) => listener());
}

function useSystemDark(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false
  );
}

function applyToDocument(
  config: AppearanceConfig,
  resolvedMode: "light" | "dark"
): void {
  const root = document.documentElement;
  const accent = findAccent(config.accentId);

  root.dataset.theme = resolvedMode;
  root.dataset.accent = accent.id;
  root.dataset.vibrantPalette = String(config.vibrant);
  root.dataset.animations = String(config.animations);
  root.dataset.background = config.backgroundId;
  root.style.setProperty("--accent", accent.accent);
  root.style.setProperty("--accent-foreground", accent.accentForeground);
}

interface AppearanceContextValue {
  config: AppearanceConfig;
  resolvedMode: "light" | "dark";
  accent: AccentPreset;
  background: ResolvedBackground;
  setMode: (mode: ColorMode) => void;
  setAccent: (accentId: string) => void;
  setVibrant: (vibrant: boolean) => void;
  setBackground: (backgroundId: string) => void;
  setWallpaperDim: (value: number) => void;
  setAnimations: (animations: boolean) => void;
  reset: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const config = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const systemDark = useSystemDark();

  const resolvedMode: "light" | "dark" =
    config.mode === "system" ? (systemDark ? "dark" : "light") : config.mode;

  useEffect(() => {
    applyToDocument(config, resolvedMode);
  }, [config, resolvedMode]);

  const update = useCallback((patch: Partial<AppearanceConfig>) => {
    write({ ...getSnapshot(), ...patch });
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      config,
      resolvedMode,
      accent: findAccent(config.accentId),
      background: resolveBackground(config.backgroundId, resolvedMode),
      setMode: (mode) => update({ mode }),
      setAccent: (accentId) => update({ accentId }),
      setVibrant: (vibrant) => update({ vibrant }),
      setBackground: (backgroundId) => update({ backgroundId }),
      setWallpaperDim: (wallpaperDim) => update({ wallpaperDim }),
      setAnimations: (animations) => update({ animations }),
      reset: () => write(DEFAULT_APPEARANCE),
    }),
    [config, resolvedMode, update]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}

export { ACCENTS };
