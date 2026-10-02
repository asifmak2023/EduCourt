import { useState } from "react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
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
      setError(caught instanceof ApiError ? caught.message : "Unable to sign in.");
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
            Appearance
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.brand, { color: colors.foreground }]}>
        Education Information System
      </Text>
      <Text style={[styles.tagline, { color: colors.muted }]}>
        Sign in to your campus dashboard.
      </Text>

      <Card>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
        />

        {error ? <ErrorText message={error} /> : null}

        <PrimaryButton label="Sign in" onPress={() => void signIn()} loading={loading} />
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
