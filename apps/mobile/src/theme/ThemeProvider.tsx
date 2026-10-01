import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";
import {
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
import { buildColors, type ThemeColors } from "./colors";

interface ThemeContextValue {
  ready: boolean;
  config: AppearanceConfig;
  resolvedMode: "light" | "dark";
  colors: ThemeColors;
  accent: AccentPreset;
  background: ResolvedBackground;
  animationsEnabled: boolean;
  setMode: (mode: ColorMode) => void;
  setAccent: (accentId: string) => void;
  setVibrant: (vibrant: boolean) => void;
  setBackground: (backgroundId: string) => void;
  setWallpaperDim: (value: number) => void;
  setAnimations: (animations: boolean) => void;
  setGlass: (glass: boolean) => void;
  setGlassBlur: (value: number) => void;
  setGlassTransparency: (value: number) => void;
  setBackgroundBlur: (value: number) => void;
  reset: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [config, setConfig] = useState<AppearanceConfig>(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(APPEARANCE_STORAGE_KEY)
      .then((raw) => {
        if (active && raw) {
          setConfig(normalizeAppearance(JSON.parse(raw)));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );

    return () => subscription.remove();
  }, []);

  const update = useCallback((patch: Partial<AppearanceConfig>) => {
    setConfig((previous) => {
      const next = { ...previous, ...patch };
      AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next)).catch(
        () => undefined
      );
      return next;
    });
  }, []);

  const resolvedMode: "light" | "dark" =
    config.mode === "system" ? (scheme === "dark" ? "dark" : "light") : config.mode;

  const accent = findAccent(config.accentId);
  const colors = useMemo(
    () =>
      buildColors(
        resolvedMode,
        accent.accent,
        accent.accentForeground,
        config.vibrant,
        config.glassTransparency
      ),
    [resolvedMode, accent, config.vibrant, config.glassTransparency]
  );
  const background = useMemo(
    () => resolveBackground(config.backgroundId, resolvedMode),
    [config.backgroundId, resolvedMode]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      ready,
      config,
      resolvedMode,
      colors,
      accent,
      background,
      animationsEnabled: config.animations && !reduceMotion,
      setMode: (mode) => update({ mode }),
      setAccent: (accentId) => update({ accentId }),
      setVibrant: (vibrant) => update({ vibrant }),
      setBackground: (backgroundId) => update({ backgroundId }),
      setWallpaperDim: (wallpaperDim) => update({ wallpaperDim }),
      setAnimations: (animations) => update({ animations }),
      setGlass: (glass) => update({ glass }),
      setGlassBlur: (glassBlur) => update({ glassBlur }),
      setGlassTransparency: (glassTransparency) => update({ glassTransparency }),
      setBackgroundBlur: (backgroundBlur) => update({ backgroundBlur }),
      reset: () => update(DEFAULT_APPEARANCE),
    }),
    [ready, config, resolvedMode, colors, accent, background, reduceMotion, update]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
