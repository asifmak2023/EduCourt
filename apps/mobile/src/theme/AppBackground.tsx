import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "./ThemeProvider";

export function AppBackground() {
  const { background, config } = useTheme();

  if (background.kind === "default") {
    return null;
  }

  if (background.kind === "solid" && background.color) {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: background.color }]}
      />
    );
  }

  if (background.kind === "gradient" && background.colors) {
    return (
      <LinearGradient
        pointerEvents="none"
        colors={background.colors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }

  if (background.kind === "wallpaper" && background.imageUrl) {
    const dim = config.wallpaperDim / 100;

    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: background.imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        {dim > 0 ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: `rgba(0, 0, 0, ${dim})` },
            ]}
          />
        ) : null}
      </View>
    );
  }

  return null;
}
