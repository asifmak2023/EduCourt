import { useState } from "react";
import { useTranslation } from "@eis/i18n";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ApiError, apiFetch, setToken, type AuthUser } from "../lib/api";
import { Card, ErrorText, PrimaryButton, TextField } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";

export function LoginScreen({
  onAuthenticated,
  onAppearance,
}: {
  onAuthenticated: (user: AuthUser) => void;
  onAppearance: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!email.trim() || !password) {
      setError(t("auth.missingCredentials"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ token: string; user: AuthUser }>(
        "/v1/auth/login",
        { method: "POST", body: { email: email.trim(), password } }
      );
      setToken(response.token);
      onAuthenticated(response.user);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("auth.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.topRow}>
        <Pressable
          onPress={onAppearance}
          accessibilityRole="button"
          style={[styles.pill, { backgroundColor: colors.accentSoft }]}
        >
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>
            {t("appearance.title")}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.brand, { color: colors.foreground }]}>
        {t("auth.brand")}
      </Text>
      <Text style={[styles.tagline, { color: colors.muted }]}>
        {t("auth.tagline")}
      </Text>

      <Card>
        <TextField
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.emailPlaceholder")}
          keyboardType="email-address"
        />
        <TextField
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          placeholder={t("auth.passwordPlaceholder")}
          secureTextEntry
        />

        {error ? <ErrorText message={error} /> : null}

        <PrimaryButton
          label={t("auth.signIn")}
          onPress={() => void signIn()}
          loading={loading}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  topRow: {
    alignItems: "flex-end",
    marginBottom: 18,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  brand: {
    fontSize: 24,
    fontWeight: "800",
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
  },
});
