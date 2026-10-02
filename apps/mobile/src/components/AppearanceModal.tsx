import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  ACCENTS,
  GRADIENTS,
  SOLIDS,
  WALLPAPERS,
  type BackgroundKind,
  type ColorMode,
} from "@eis/appearance";
import { useTranslation } from "@eis/i18n";
import { useTheme } from "../theme/ThemeProvider";
import { withAlpha, type ThemeColors } from "../theme/colors";

const MODES = [
  { value: "system", key: "appearance.mode.system" },
  { value: "light", key: "appearance.mode.light" },
  { value: "dark", key: "appearance.mode.dark" },
] as const satisfies readonly { value: ColorMode; key: string }[];

const FAMILIES = [
  { value: "default", key: "appearance.family.default" },
  { value: "solid", key: "appearance.family.solid" },
  { value: "gradient", key: "appearance.family.gradient" },
  { value: "wallpaper", key: "appearance.family.wallpaper" },
] as const satisfies readonly { value: BackgroundKind; key: string }[];

function familyOf(backgroundId: string): BackgroundKind {
  if (SOLIDS.some((solid) => solid.id === backgroundId)) return "solid";
  if (GRADIENTS.some((gradient) => gradient.id === backgroundId)) return "gradient";
  if (WALLPAPERS.some((wallpaper) => wallpaper.id === backgroundId)) {
    return "wallpaper";
  }
  return "default";
}

function StepperRow({
  styles,
  label,
  hint,
  value,
  suffix,
  disabled,
  onDecrease,
  onIncrease,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  hint?: string;
  value: number;
  suffix?: string;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={[styles.stepperRow, disabled ? styles.disabledRow : null]}>
      <View style={styles.toggleLabel}>
        <Text style={styles.rowTitle}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={styles.stepper}>
        <Pressable
          onPress={onDecrease}
          disabled={disabled}
          style={styles.stepperButton}
          accessibilityRole="button"
          accessibilityLabel={t("appearance.decreaseLabel", { label })}
        >
          <Text style={styles.stepperText}>-</Text>
        </Pressable>
        <Text style={styles.stepperValue}>
          {value}
          {suffix ?? ""}
        </Text>
        <Pressable
          onPress={onIncrease}
          disabled={disabled}
          style={styles.stepperButton}
          accessibilityRole="button"
          accessibilityLabel={t("appearance.increaseLabel", { label })}
        >
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AppearanceModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t, locale, setLocale, locales } = useTranslation();
  const { colors, config, resolvedMode } = theme;
  const styles = makeStyles(colors);
  const [family, setFamily] = useState<BackgroundKind>(familyOf(config.backgroundId));
  const isDark = resolvedMode === "dark";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{t("appearance.title")}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.sheetClose}>{t("common.done")}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Text style={styles.sectionTitle}>{t("appearance.language")}</Text>
          <Text style={styles.rowHint}>{t("appearance.languageHint")}</Text>
          <View style={styles.row}>
            {locales.map((entry) => {
              const selected = locale === entry.code;
              return (
                <Pressable
                  key={entry.code}
                  onPress={() => setLocale(entry.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.langChip, selected ? styles.segmentActive : null]}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      selected ? styles.segmentTextActive : null,
                    ]}
                  >
                    {entry.nativeName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>{t("appearance.colorMode")}</Text>
          <View style={styles.segmented}>
            {MODES.map((mode) => {
              const selected = config.mode === mode.value;
              return (
                <Pressable
                  key={mode.value}
                  onPress={() => theme.setMode(mode.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.segment, selected ? styles.segmentActive : null]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selected ? styles.segmentTextActive : null,
                    ]}
                  >
                    {t(mode.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>{t("appearance.accentColor")}</Text>
          <View style={styles.row}>
            {ACCENTS.map((accent) => {
              const selected = config.accentId === accent.id;
              return (
                <Pressable
                  key={accent.id}
                  onPress={() => theme.setAccent(accent.id)}
                  accessibilityRole="button"
                  accessibilityLabel={accent.label}
                  style={[
                    styles.accentSwatch,
                    { backgroundColor: accent.accent },
                    selected ? styles.accentSwatchActive : null,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.rowTitle}>{t("appearance.vibrantPalette")}</Text>
              <Text style={styles.rowHint}>
                {t("appearance.vibrantPaletteHint")}
              </Text>
            </View>
            <Switch value={config.vibrant} onValueChange={theme.setVibrant} />
          </View>

          <Text style={styles.sectionTitle}>{t("appearance.background")}</Text>
          <View style={styles.segmented}>
            {FAMILIES.map((item) => {
              const selected = family === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setFamily(item.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.segment, selected ? styles.segmentActive : null]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selected ? styles.segmentTextActive : null,
                    ]}
                  >
                    {t(item.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {family === "default" ? (
            <Pressable
              onPress={() => theme.setBackground("default")}
              accessibilityRole="button"
              accessibilityState={{ selected: config.backgroundId === "default" }}
              style={[
                styles.defaultOption,
                config.backgroundId === "default" ? styles.swatchActive : null,
              ]}
            >
              <Text style={styles.defaultOptionText}>
                {t("appearance.defaultSurface")}
              </Text>
            </Pressable>
          ) : null}

          {family === "solid" ? (
            <View style={styles.grid}>
              {SOLIDS.map((solid) => (
                <Pressable
                  key={solid.id}
                  onPress={() => theme.setBackground(solid.id)}
                  accessibilityRole="button"
                  accessibilityLabel={solid.label}
                  style={[
                    styles.gridSwatch,
                    config.backgroundId === solid.id ? styles.swatchActive : null,
                  ]}
                >
                  <View
                    style={[
                      styles.gridSwatchFill,
                      { backgroundColor: isDark ? solid.dark : solid.light },
                    ]}
                  />
                  <Text style={styles.gridCaption}>{solid.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {family === "gradient" ? (
            <View style={styles.grid}>
              {GRADIENTS.map((gradient) => (
                <Pressable
                  key={gradient.id}
                  onPress={() => theme.setBackground(gradient.id)}
                  accessibilityRole="button"
                  accessibilityLabel={gradient.label}
                  style={[
                    styles.gridSwatch,
                    config.backgroundId === gradient.id ? styles.swatchActive : null,
                  ]}
                >
                  <LinearGradient
                    colors={
                      (isDark ? gradient.dark : gradient.light) as [
                        string,
                        string,
                        ...string[],
                      ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gridSwatchFill}
                  />
                  <Text style={styles.gridCaption}>{gradient.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {family === "wallpaper" ? (
            <View style={styles.grid}>
              {WALLPAPERS.map((wallpaper) => (
                <Pressable
                  key={wallpaper.id}
                  onPress={() => theme.setBackground(wallpaper.id)}
                  accessibilityRole="button"
                  accessibilityLabel={wallpaper.label}
                  style={[
                    styles.gridSwatch,
                    config.backgroundId === wallpaper.id ? styles.swatchActive : null,
                  ]}
                >
                  <Image
                    source={{ uri: wallpaper.thumbUrl }}
                    style={styles.gridSwatchFill}
                  />
                  <Text style={styles.gridCaption} numberOfLines={1}>
                    {wallpaper.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {family === "wallpaper" ? (
            <View style={styles.dimRow}>
              <Text style={styles.rowTitle}>{t("appearance.dimming")}</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() =>
                    theme.setWallpaperDim(Math.max(0, config.wallpaperDim - 10))
                  }
                  style={styles.stepperButton}
                  accessibilityRole="button"
                  accessibilityLabel={t("appearance.decreaseDimming")}
                >
                  <Text style={styles.stepperText}>-</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{config.wallpaperDim}%</Text>
                <Pressable
                  onPress={() =>
                    theme.setWallpaperDim(Math.min(80, config.wallpaperDim + 10))
                  }
                  style={styles.stepperButton}
                  accessibilityRole="button"
                  accessibilityLabel={t("appearance.increaseDimming")}
                >
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>{t("appearance.surface")}</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.rowTitle}>{t("appearance.glassSurfaces")}</Text>
              <Text style={styles.rowHint}>
                {t("appearance.glassSurfacesHint")}
              </Text>
            </View>
            <Switch value={config.glass} onValueChange={theme.setGlass} />
          </View>

          <StepperRow
            styles={styles}
            label={t("appearance.glassBlur")}
            hint={t("appearance.glassBlurHint")}
            value={config.glassBlur}
            suffix="px"
            disabled={!config.glass}
            onDecrease={() =>
              theme.setGlassBlur(Math.max(0, config.glassBlur - 2))
            }
            onIncrease={() =>
              theme.setGlassBlur(Math.min(24, config.glassBlur + 2))
            }
          />

          <StepperRow
            styles={styles}
            label={t("appearance.transparency")}
            hint={t("appearance.transparencyHint")}
            value={config.glassTransparency}
            suffix="%"
            disabled={!config.glass}
            onDecrease={() =>
              theme.setGlassTransparency(
                Math.max(0, config.glassTransparency - 5)
              )
            }
            onIncrease={() =>
              theme.setGlassTransparency(
                Math.min(100, config.glassTransparency + 5)
              )
            }
          />

          <StepperRow
            styles={styles}
            label={t("appearance.backgroundBlur")}
            hint={t("appearance.backgroundBlurHint")}
            value={config.backgroundBlur}
            suffix="px"
            disabled={familyOf(config.backgroundId) === "default"}
            onDecrease={() =>
              theme.setBackgroundBlur(Math.max(0, config.backgroundBlur - 2))
            }
            onIncrease={() =>
              theme.setBackgroundBlur(Math.min(24, config.backgroundBlur + 2))
            }
          />

          <View style={styles.presetBlock}>
            <Text style={styles.presetHint}>
              {t("appearance.presetHint")}
            </Text>
            <Pressable
              onPress={() => {
                theme.setGlass(true);
                theme.setGlassBlur(12);
                theme.setGlassTransparency(15);
                theme.setBackgroundBlur(0);
              }}
              accessibilityRole="button"
              accessibilityLabel={t("appearance.recommendedA11y")}
              style={styles.presetButton}
            >
              <Text style={styles.presetText}>{t("appearance.recommended")}</Text>
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.rowTitle}>{t("appearance.interfaceAnimations")}</Text>
              <Text style={styles.rowHint}>
                {t("appearance.interfaceAnimationsHint")}
              </Text>
            </View>
            <Switch value={config.animations} onValueChange={theme.setAnimations} />
          </View>

          <Pressable
            onPress={theme.reset}
            accessibilityRole="button"
            style={styles.resetButton}
          >
            <Text style={styles.resetText}>{t("appearance.reset")}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sheet: {
      flex: 1,
      backgroundColor: colors.background,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.foreground,
    },
    sheetClose: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.accent,
    },
    sheetBody: {
      paddingHorizontal: 20,
      paddingBottom: 48,
    },
    sectionTitle: {
      marginTop: 20,
      marginBottom: 10,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.muted,
    },
    segmented: {
      flexDirection: "row",
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      padding: 4,
    },
    segment: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: "center",
    },
    segmentActive: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.muted,
    },
    segmentTextActive: {
      color: colors.accentForeground,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    accentSwatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "transparent",
    },
    accentSwatchActive: {
      borderColor: colors.foreground,
    },
    langChip: {
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 9,
      backgroundColor: colors.surfaceSecondary,
    },
    langChipText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.muted,
    },
    toggleRow: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toggleLabel: {
      flex: 1,
      paddingRight: 12,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
    },
    rowHint: {
      marginTop: 2,
      fontSize: 12,
      color: colors.muted,
    },
    defaultOption: {
      marginTop: 12,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    defaultOptionText: {
      fontSize: 14,
      color: colors.foreground,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12,
    },
    gridSwatch: {
      width: "30%",
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      overflow: "hidden",
    },
    swatchActive: {
      borderColor: colors.accent,
    },
    gridSwatchFill: {
      width: "100%",
      height: 56,
    },
    gridCaption: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontSize: 12,
      color: colors.muted,
    },
    dimRow: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    stepperRow: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    disabledRow: {
      opacity: 0.5,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    stepperButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.foreground,
    },
    stepperValue: {
      minWidth: 48,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
    },
    resetButton: {
      marginTop: 28,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: withAlpha(colors.accent, 0.14),
    },
    resetText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.accent,
    },
    presetBlock: {
      marginTop: 16,
    },
    presetHint: {
      fontSize: 12,
      color: colors.muted,
    },
    presetButton: {
      marginTop: 8,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: withAlpha(colors.accent, 0.14),
    },
    presetText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accent,
    },
  });
}
