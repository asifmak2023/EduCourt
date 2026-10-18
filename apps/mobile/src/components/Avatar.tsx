import { Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

const SIZES = {
  sm: 36,
  md: 48,
  lg: 96,
} as const;

const DEFAULT_AVATAR = require("../../assets/default-avatar.png");

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

  const source = photoUrl ? { uri: photoUrl } : DEFAULT_AVATAR;

  return (
    <Image
      source={source}
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

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});
