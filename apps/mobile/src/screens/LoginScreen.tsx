import { useState } from "react";
import { useTranslation } from "@eis/i18n";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ApiError,
  apiFetch,
  getConfiguredServerUrl,
  isValidServerUrl,
  setServerUrl,
  setToken,
  type AuthUser,
} from "../lib/api";
import { Card, ErrorText, PrimaryButton, TextField } from "../components/ui";
import { BrandMark } from "../components/BrandMark";
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
  const [showServer, setShowServer] = useState(false);
  const [serverUrl, setServerUrlValue] = useState(() => getConfiguredServerUrl());
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSaved, setServerSaved] = useState(false);

  async function saveServer() {
    setServerError(null);
    setServerSaved(false);

    if (!isValidServerUrl(serverUrl)) {
      setServerError(t("auth.serverInvalid"));
      return;
    }

    await setServerUrl(serverUrl);
    setServerUrlValue(getConfiguredServerUrl());
    setServerSaved(true);
  }

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

      <BrandMark size={64} />

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

        <Pressable
          onPress={() => setShowServer((current) => !current)}
          accessibilityRole="button"
          style={styles.serverToggle}
        >
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>
            {t("auth.server")}
          </Text>
        </Pressable>

        {showServer ? (
          <View>
            <TextField
              label={t("auth.serverTitle")}
              value={serverUrl}
              onChangeText={setServerUrlValue}
              placeholder={t("auth.serverPlaceholder")}
              keyboardType="default"
            />
            <Text style={[styles.hint, { color: colors.muted }]}>
              {t("auth.serverHint")}
            </Text>
            {serverError ? <ErrorText message={serverError} /> : null}
            {serverSaved && !serverError ? (
              <Text style={[styles.hint, { color: colors.success }]}>
                {t("auth.serverSaved")}
              </Text>
            ) : null}
            <PrimaryButton label={t("auth.serverSave")} onPress={() => void saveServer()} />
          </View>
        ) : null}
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
    marginTop: 18,
    fontSize: 24,
    fontWeight: "800",
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
  },
  serverToggle: {
    marginTop: 18,
    alignItems: "center",
    paddingVertical: 6,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
  },
});
