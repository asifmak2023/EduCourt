import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  apiFetch,
  loadStoredToken,
  setToken,
  type AuthUser,
  type StudentSummary,
} from "./src/lib/api";
import { fetchChildren } from "./src/lib/portal";
import { AppearanceModal } from "./src/components/AppearanceModal";
import { AppBackground } from "./src/theme/AppBackground";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { withAlpha } from "./src/theme/colors";
import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { TimetableScreen } from "./src/screens/TimetableScreen";
import { AttendanceScreen } from "./src/screens/AttendanceScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { FeesScreen } from "./src/screens/FeesScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

type TabKey =
  | "dashboard"
  | "timetable"
  | "attendance"
  | "results"
  | "fees"
  | "profile";

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const { colors, resolvedMode, ready, background, config } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [showAppearance, setShowAppearance] = useState(false);
  const [booting, setBooting] = useState(true);

  const signedIn = user !== null;
  const portal = students.length > 0;
  const frosted = background.kind !== "default" || config.glass;
  const blurIntensity = Math.min(
    100,
    Math.max(1, Math.round((config.glassBlur / 24) * 100))
  );

  useEffect(() => {
    let active = true;

    (async () => {
      const token = await loadStoredToken();

      if (!token) {
        if (active) {
          setBooting(false);
        }
        return;
      }

      try {
        const response = await apiFetch<{ data: AuthUser }>("/v1/auth/me");
        if (active) {
          setUser(response.data);
        }
      } catch {
        setToken(null);
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setStudents([]);
      setActiveStudentId(null);
      return;
    }

    let active = true;

    fetchChildren()
      .then((list) => {
        if (!active) {
          return;
        }
        setStudents(list);
        setActiveStudentId((previous) => previous ?? list[0]?.id ?? null);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors while signing out.
    }
    setToken(null);
    setUser(null);
    setTab("dashboard");
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const valid = buildTabs(user, students.length > 0).some(
      (entry) => entry.key === tab
    );

    if (!valid) {
      setTab("dashboard");
    }
  }, [user, students, tab]);

  if (!ready || booting) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const tabs = buildTabs(user, portal);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBackground />
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />

      {user ? (
        renderScreen({
          tab,
          user,
          students,
          activeStudentId,
          portal,
          onAppearance: () => setShowAppearance(true),
          onSelectStudent: setActiveStudentId,
          onUserChange: setUser,
          onSignOut: () => void signOut(),
        })
      ) : (
        <LoginScreen onAuthenticated={setUser} />
      )}

      {user ? (
        <View
          style={[
            styles.tabBar,
            {
              borderColor: colors.border,
              backgroundColor: frosted
                ? withAlpha(colors.surface, 0.9)
                : colors.surface,
            },
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
          {tabs.map((entry) => {
            const active = entry.key === tab;

            return (
              <Pressable
                key={entry.key}
                onPress={() => setTab(entry.key)}
                style={styles.tabItem}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? colors.accent : colors.muted },
                  ]}
                  numberOfLines={1}
                >
                  {entry.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <AppearanceModal
        visible={showAppearance}
        onClose={() => setShowAppearance(false)}
      />
    </View>
  );
}

function buildTabs(user: AuthUser | null, portal: boolean): { key: TabKey; label: string }[] {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
  ];

  if (!user) {
    return tabs;
  }

  const has = (permission: string) => user.permissions.includes(permission);

  if (portal) {
    if (has("timetable.view")) {
      tabs.push({ key: "timetable", label: "Timetable" });
    }
    if (has("attendance.view")) {
      tabs.push({ key: "attendance", label: "Attendance" });
    }
    if (has("exam.view")) {
      tabs.push({ key: "results", label: "Results" });
    }
    if (has("fee.view")) {
      tabs.push({ key: "fees", label: "Fees" });
    }
  }

  tabs.push({ key: "profile", label: "Profile" });

  return tabs;
}

function renderScreen({
  tab,
  user,
  students,
  activeStudentId,
  portal,
  onAppearance,
  onSelectStudent,
  onUserChange,
  onSignOut,
}: {
  tab: TabKey;
  user: AuthUser;
  students: StudentSummary[];
  activeStudentId: number | null;
  portal: boolean;
  onAppearance: () => void;
  onSelectStudent: (id: number) => void;
  onUserChange: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  if (tab === "profile") {
    return (
      <ProfileScreen
        user={user}
        onUserChange={onUserChange}
        onSignOut={onSignOut}
        onAppearance={onAppearance}
      />
    );
  }

  if (!portal) {
    return (
      <DashboardScreen user={user} students={students} onAppearance={onAppearance} />
    );
  }

  const scoped = {
    students,
    activeStudentId,
    onSelectStudent,
    onAppearance,
  };

  switch (tab) {
    case "timetable":
      return <TimetableScreen {...scoped} />;
    case "attendance":
      return <AttendanceScreen {...scoped} />;
    case "results":
      return <ResultsScreen {...scoped} />;
    case "fees":
      return <FeesScreen {...scoped} />;
    default:
      return (
        <DashboardScreen user={user} students={students} onAppearance={onAppearance} />
      );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});
