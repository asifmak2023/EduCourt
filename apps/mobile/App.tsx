import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiError, apiFetch, setToken, type AuthUser } from "./src/lib/api";
import { AppearanceModal } from "./src/components/AppearanceModal";
import { AppBackground } from "./src/theme/AppBackground";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { withAlpha, type ThemeColors } from "./src/theme/colors";

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const { colors, resolvedMode, ready, background, config } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const hasBackground = background.kind !== "default";
  const glassEnabled = config.glass;
  const frosted = hasBackground || glassEnabled;
  const blurIntensity = Math.min(
    100,
    Math.max(1, Math.round((config.glassBlur / 24) * 100))
  );
  const headerStyle = [
    styles.headerBlock,
    frosted ? styles.headerScrim : null,
    glassEnabled ? { backgroundColor: colors.glassSurfaceSecondary } : null,
  ];
  const cardStyle = [
    styles.card,
    glassEnabled ? { backgroundColor: colors.glassSurface } : null,
  ];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ token: string; user: AuthUser }>(
        "/v1/auth/login",
        { method: "POST", body: { email, password } }
      );
      setToken(response.token);
      setUser(response.user);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      await apiFetch("/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors while signing out.
    }
    setToken(null);
    setUser(null);
  }

  if (!ready) {
    return (
      <View style={styles.loading}>
        <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppBackground />
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />

      {user ? (
        <ScrollView contentContainerStyle={styles.screen}>
          <View style={headerStyle}>
            {glassEnabled ? (
              <BlurView
                intensity={blurIntensity}
                tint={resolvedMode === "dark" ? "dark" : "light"}
                blurMethod="dimezisBlurViewSdk31Plus"
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View style={styles.headerRow}>
              <Text style={styles.title}>Dashboard</Text>
              <Pressable
                style={styles.pill}
                onPress={() => setShowAppearance(true)}
                accessibilityRole="button"
              >
                <Text style={styles.pillText}>Appearance</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              {user.institution?.name ?? "Institution"} -{" "}
              {user.campus?.name ?? "All campuses"}
            </Text>
          </View>

          <View style={cardStyle}>
            <Text style={styles.cardLabel}>Signed in as</Text>
            <Text style={styles.cardValue}>{user.name}</Text>
            <Text style={styles.subtitle}>{user.email}</Text>
          </View>

          <View style={cardStyle}>
            <Text style={styles.cardLabel}>Roles</Text>
            <Text style={styles.cardValue}>{user.roles.join(", ")}</Text>
          </View>

          <View style={cardStyle}>
            <Text style={styles.cardLabel}>Accessible modules</Text>
            <Text style={styles.cardValue}>
              {Array.from(
                new Set(user.permissions.map((permission) => permission.split(".")[0]))
              )
                .sort()
                .join(", ")}
            </Text>
          </View>

          <Pressable style={styles.buttonGhost} onPress={signOut}>
            <Text style={styles.buttonGhostText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.screen}>
          <View style={headerStyle}>
            {glassEnabled ? (
              <BlurView
                intensity={blurIntensity}
                tint={resolvedMode === "dark" ? "dark" : "light"}
                blurMethod="dimezisBlurViewSdk31Plus"
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View style={styles.headerRow}>
              <Text style={styles.title}>Education Information System</Text>
              <Pressable
                style={styles.pill}
                onPress={() => setShowAppearance(true)}
                accessibilityRole="button"
              >
                <Text style={styles.pillText}>Appearance</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>Sign in to your campus dashboard.</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={signIn} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.accentForeground} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>
        </ScrollView>
      )}

      <AppearanceModal
        visible={showAppearance}
        onClose={() => setShowAppearance(false)}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    screen: {
      flexGrow: 1,
      padding: 24,
      paddingTop: 72,
    },
    headerBlock: {
      marginBottom: 4,
    },
    headerScrim: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: withAlpha(colors.surface, 0.82),
      overflow: "hidden",
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
      color: colors.foreground,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      color: colors.muted,
    },
    pill: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.accentSoft,
    },
    pillText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accent,
    },
    input: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      color: colors.foreground,
      fontSize: 15,
    },
    button: {
      marginTop: 20,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.accent,
    },
    buttonText: {
      color: colors.accentForeground,
      fontSize: 15,
      fontWeight: "600",
    },
    buttonGhost: {
      marginTop: 24,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonGhostText: {
      color: colors.foreground,
      fontSize: 15,
      fontWeight: "600",
    },
    error: {
      marginTop: 12,
      color: colors.danger,
      fontSize: 14,
    },
    card: {
      marginTop: 16,
      borderRadius: 14,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardLabel: {
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.muted,
    },
    cardValue: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
    },
  });
}
