import type { ReactNode } from "react";
import { BlurView } from "expo-blur";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../theme/colors";

export function Screen({
  title,
  subtitle,
  onAppearance,
  children,
}: {
  title: string;
  subtitle?: string;
  onAppearance?: () => void;
  children: ReactNode;
}) {
  const { colors, resolvedMode, background, config } = useTheme();
  const hasBackground = background.kind !== "default";
  const frosted = hasBackground || config.glass;
  const blurIntensity = Math.min(
    100,
    Math.max(1, Math.round((config.glassBlur / 24) * 100))
  );

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View
        style={[
          styles.header,
          frosted
            ? {
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: withAlpha(colors.surface, 0.82),
                overflow: "hidden",
              }
            : null,
          config.glass ? { backgroundColor: colors.glassSurfaceSecondary } : null,
        ]}
      >
        {config.glass ? (
          <BlurView
            intensity={blurIntensity}
            tint={resolvedMode === "dark" ? "dark" : "light"}
            blurMethod="dimezisBlurViewSdk31Plus"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {title}
          </Text>
          {onAppearance ? (
            <Pressable
              style={[styles.pill, { backgroundColor: colors.accentSoft }]}
              onPress={onAppearance}
              accessibilityRole="button"
            >
              <Text style={[styles.pillText, { color: colors.accent }]}>
                Appearance
              </Text>
            </Pressable>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
        ) : null}
      </View>

      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
