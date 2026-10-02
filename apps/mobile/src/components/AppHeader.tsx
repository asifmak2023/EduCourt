import { BlurView } from "expo-blur";
import { useTranslation } from "@eis/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../theme/colors";

export function AppHeader({
  title,
  subtitle,
  onMenu,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const { colors, resolvedMode, background, config } = useTheme();
  const frosted = background.kind !== "default" || config.glass;
  const blurIntensity = Math.min(
    100,
    Math.max(1, Math.round((config.glassBlur / 24) * 100))
  );

  return (
    <View
      style={[
        styles.header,
        frosted
          ? {
              backgroundColor: withAlpha(colors.surface, 0.82),
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
            }
          : { borderBottomColor: colors.border, borderBottomWidth: 1 },
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

      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            style={[styles.menuButton, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700", lineHeight: 22 }}>
              {"<"}
            </Text>
          </Pressable>
        ) : onMenu ? (
          <Pressable
            onPress={onMenu}
            accessibilityRole="button"
            accessibilityLabel={t("navigation.open")}
            style={[styles.menuButton, { borderColor: colors.border }]}
          >
            <View style={styles.menuLines}>
              <View style={[styles.menuLine, { backgroundColor: colors.foreground }]} />
              <View style={[styles.menuLine, { backgroundColor: colors.foreground }]} />
              <View style={[styles.menuLine, { backgroundColor: colors.foreground }]} />
            </View>
          </Pressable>
        ) : null}

        <View style={styles.titles}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLines: {
    gap: 4,
  },
  menuLine: {
    width: 18,
    height: 2,
    borderRadius: 2,
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
});
