import { StatusBar } from "expo-status-bar";
import { useState } from "react";
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

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  if (user) {
    const modules = Array.from(
      new Set(user.permissions.map((permission) => permission.split(".")[0]))
    ).sort();

    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <StatusBar style="dark" />
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          {user.institution?.name ?? "Institution"} - {user.campus?.name ?? "All campuses"}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Signed in as</Text>
          <Text style={styles.cardValue}>{user.name}</Text>
          <Text style={styles.subtitle}>{user.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Roles</Text>
          <Text style={styles.cardValue}>{user.roles.join(", ")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Accessible modules</Text>
          <Text style={styles.cardValue}>{modules.join(", ")}</Text>
        </View>

        <Pressable style={styles.buttonGhost} onPress={signOut}>
          <Text style={styles.buttonGhostText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Education Information System</Text>
      <Text style={styles.subtitle}>Sign in to your campus dashboard.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={signIn} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 72,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748b",
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    fontSize: 15,
  },
  button: {
    marginTop: 20,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonGhost: {
    marginTop: 24,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  buttonGhostText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  error: {
    marginTop: 12,
    color: "#b91c1c",
    fontSize: 14,
  },
  card: {
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#64748b",
  },
  cardValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
});
