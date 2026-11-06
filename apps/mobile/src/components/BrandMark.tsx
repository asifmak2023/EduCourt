import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

const MARK = require("../../assets/splash-icon.png");

export function BrandMark({
  size = 40,
  showName = false,
}: {
  size?: number;
  showName?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Image
        source={MARK}
        accessibilityLabel="EduCourt"
        resizeMode="contain"
        style={[styles.mark, { width: size, height: size }]}
      />
      {showName ? (
        <Text style={[styles.name, { color: colors.foreground }]}>EduCourt</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mark: {
    resizeMode: "contain",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
});
