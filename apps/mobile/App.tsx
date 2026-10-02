import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  apiFetch,
  loadStoredToken,
  setToken,
  type AuthUser,
  type StudentSummary,
} from "./src/lib/api";
import { fetchChildren } from "./src/lib/portal";
import { buildTabs, findTab, type TabKey } from "./src/lib/nav";
import { AppearanceModal } from "./src/components/AppearanceModal";
import { AppHeader } from "./src/components/AppHeader";
import { Sidebar } from "./src/components/Sidebar";
import { AppBackground } from "./src/theme/AppBackground";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { TimetableScreen } from "./src/screens/TimetableScreen";
import { AttendanceScreen } from "./src/screens/AttendanceScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { FeesScreen } from "./src/screens/FeesScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

const WIDE_BREAKPOINT = 900;

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const { colors, resolvedMode, ready } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [booting, setBooting] = useState(true);

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
    setDrawerOpen(false);
  }, []);

  const tabs = buildTabs(user, students.length > 0);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!tabs.some((entry) => entry.key === tab)) {
      setTab("dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, students, tab]);

  if (!ready || booting) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const activeTab = findTab(tabs, tab);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBackground />
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />

      {user ? (
        <View style={styles.shell}>
          <Sidebar
            wide={wide}
            open={drawerOpen}
            user={user}
            tabs={tabs}
            activeTab={tab}
            students={students}
            activeStudentId={activeStudentId}
            onClose={() => setDrawerOpen(false)}
            onSelectTab={setTab}
            onSelectStudent={(id) => {
              setActiveStudentId(id);
              setDrawerOpen(false);
            }}
            onAppearance={() => setShowAppearance(true)}
            onSignOut={() => void signOut()}
          />

          <View style={styles.content}>
            <AppHeader
              title={activeTab.label}
              subtitle={activeTab.subtitle}
              onMenu={wide ? undefined : () => setDrawerOpen(true)}
            />
            {renderScreen({
              tab,
              user,
              students,
              activeStudentId,
              portal: students.length > 0,
              onUserChange: setUser,
              onSignOut: () => void signOut(),
            })}
          </View>
        </View>
      ) : (
        <LoginScreen
          onAuthenticated={setUser}
          onAppearance={() => setShowAppearance(true)}
        />
      )}

      <AppearanceModal
        visible={showAppearance}
        onClose={() => setShowAppearance(false)}
      />
    </View>
  );
}

function renderScreen({
  tab,
  user,
  students,
  activeStudentId,
  portal,
  onUserChange,
  onSignOut,
}: {
  tab: TabKey;
  user: AuthUser;
  students: StudentSummary[];
  activeStudentId: number | null;
  portal: boolean;
  onUserChange: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  if (tab === "profile") {
    return (
      <ProfileScreen
        user={user}
        onUserChange={onUserChange}
        onSignOut={onSignOut}
      />
    );
  }

  if (!portal) {
    return <DashboardScreen user={user} students={students} />;
  }

  switch (tab) {
    case "timetable":
      return <TimetableScreen activeStudentId={activeStudentId} />;
    case "attendance":
      return <AttendanceScreen activeStudentId={activeStudentId} />;
    case "results":
      return <ResultsScreen activeStudentId={activeStudentId} />;
    case "fees":
      return <FeesScreen activeStudentId={activeStudentId} />;
    default:
      return <DashboardScreen user={user} students={students} />;
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
  shell: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
});
