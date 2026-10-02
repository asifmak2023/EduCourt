import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

const SIZES = {
  sm: 36,
  md: 48,
  lg: 96,
} as const;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const { colors } = useTheme();
  const dimension = SIZES[size];

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        accessibilityLabel={name}
        style={[
          styles.base,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            borderColor: colors.border,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        styles.fallback,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: colors.accentSoft,
        },
      ]}
    >
      <Text
        style={{
          color: colors.accent,
          fontWeight: "700",
          fontSize: dimension * 0.36,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: "transparent",
  },
});
