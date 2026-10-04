import { StatusBar } from "expo-status-bar";
import { useTranslation } from "@eis/i18n";
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
import {
  buildNav,
  findNavItem,
  isPortalKey,
  type NavItem,
} from "./src/lib/nav";
import { CampusProvider } from "./src/lib/campus";
import { AppI18nProvider, useTr } from "./src/lib/i18n";
import { findModule } from "./src/admin/registry";
import { findCustomScreen } from "./src/admin/screens";
import { ModuleListScreen } from "./src/admin/ModuleListScreen";
import { ModuleFormScreen } from "./src/admin/ModuleFormScreen";
import { ModuleDetailScreen } from "./src/admin/ModuleDetailScreen";
import { AppearanceModal } from "./src/components/AppearanceModal";
import { AppHeader, type Crumb } from "./src/components/AppHeader";
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

interface ModuleRoute {
  mode: "list" | "detail" | "create" | "edit";
  id?: number;
}

export default function App() {
  return (
    <AppI18nProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AppI18nProvider>
  );
}

function AppInner() {
  const { colors, resolvedMode, ready } = useTheme();
  const { t } = useTranslation();
  const tr = useTr();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [activeKey, setActiveKey] = useState("dashboard");
  const [moduleRoute, setModuleRoute] = useState<ModuleRoute | null>(null);
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
    setActiveKey("dashboard");
    setModuleRoute(null);
    setDrawerOpen(false);
  }, []);

  const portal = students.length > 0;
  const sections = buildNav(user, portal);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (!findNavItem(sections, activeKey)) {
      setActiveKey("dashboard");
      setModuleRoute(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, students, activeKey]);

  if (!ready || booting) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const activeItem = findNavItem(sections, activeKey);
  const activeModule = activeItem?.moduleKey ? findModule(activeItem.moduleKey) : null;
  const CustomScreen = activeItem?.customScreen
    ? findCustomScreen(activeItem.customScreen)
    : null;
  const inModuleFlow = Boolean(activeModule && moduleRoute && moduleRoute.mode !== "list");
  const activeSection =
    sections.find((section) => section.items.some((item) => item.key === activeKey)) ??
    null;

  const breadcrumbs: Crumb[] = [];
  if (activeKey !== "dashboard" && activeItem) {
    breadcrumbs.push({
      label: t("navigation.dashboard"),
      onPress: () => {
        setActiveKey("dashboard");
        setModuleRoute(null);
      },
    });
    if (activeSection && activeSection.label !== "navigation.section.overview") {
      breadcrumbs.push({ label: tr(activeSection.label) });
    }
    breadcrumbs.push({
      label: tr(activeItem.label),
      onPress: inModuleFlow ? () => setModuleRoute({ mode: "list" }) : undefined,
    });
    if (activeModule && moduleRoute) {
      if (moduleRoute.mode === "detail") {
        breadcrumbs.push({ label: t("common.details") });
      } else if (moduleRoute.mode === "create") {
        breadcrumbs.push({ label: t("common.create") });
      } else if (moduleRoute.mode === "edit") {
        breadcrumbs.push({ label: t("common.edit") });
      }
    }
  }

  const selectItem = (item: NavItem) => {
    setActiveKey(item.key);
    setModuleRoute(item.moduleKey ? { mode: "list" } : null);
    setDrawerOpen(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBackground />
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />

      {user ? (
        <CampusProvider user={user}>
          <View style={styles.shell}>
            <Sidebar
              wide={wide}
              open={drawerOpen}
              user={user}
              sections={sections}
              activeKey={activeKey}
              students={students}
              activeStudentId={activeStudentId}
              onClose={() => setDrawerOpen(false)}
              onSelectItem={selectItem}
              onSelectStudent={(id) => {
                setActiveStudentId(id);
                setDrawerOpen(false);
              }}
              onAppearance={() => setShowAppearance(true)}
              onSignOut={() => void signOut()}
            />

            <View style={styles.content}>
              <AppHeader
                title={activeItem ? tr(activeItem.label) : t("navigation.dashboard")}
                subtitle={
                  activeModule && moduleRoute && moduleRoute.mode !== "list"
                    ? tr(activeModule.label)
                    : tr(activeItem?.subtitle)
                }
                breadcrumbs={breadcrumbs}
                onMenu={wide ? undefined : () => setDrawerOpen(true)}
                onBack={
                  inModuleFlow ? () => setModuleRoute({ mode: "list" }) : undefined
                }
              />

              {CustomScreen ? (
                <CustomScreen />
              ) : activeModule && moduleRoute ? (
                <ModuleFlow
                  key={`${activeModule.key}:${moduleRoute.mode}:${moduleRoute.id ?? ""}`}
                  moduleKey={activeModule.key}
                  route={moduleRoute}
                  permissions={user.permissions}
                  onRoute={setModuleRoute}
                />
              ) : (
                renderPortalScreen({
                  screenKey: activeKey,
                  user,
                  students,
                  activeStudentId,
                  onUserChange: setUser,
                  onSignOut: () => void signOut(),
                })
              )}
            </View>
          </View>
        </CampusProvider>
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

function ModuleFlow({
  moduleKey,
  route,
  permissions,
  onRoute,
}: {
  moduleKey: string;
  route: ModuleRoute;
  permissions: string[];
  onRoute: (route: ModuleRoute) => void;
}) {
  const config = findModule(moduleKey);
  if (!config) {
    return null;
  }

  if (route.mode === "detail" && route.id) {
    return (
      <ModuleDetailScreen
        config={config}
        id={route.id}
        permissions={permissions}
        onEdit={() => onRoute({ mode: "edit", id: route.id })}
        onDeleted={() => onRoute({ mode: "list" })}
      />
    );
  }

  if (route.mode === "create") {
    return (
      <ModuleFormScreen
        config={config}
        onSaved={() => onRoute({ mode: "list" })}
        onCancel={() => onRoute({ mode: "list" })}
      />
    );
  }

  if (route.mode === "edit" && route.id) {
    return (
      <ModuleFormScreen
        config={config}
        recordId={route.id}
        onSaved={() => onRoute({ mode: "detail", id: route.id })}
        onCancel={() => onRoute({ mode: "detail", id: route.id })}
      />
    );
  }

  return (
    <ModuleListScreen
      config={config}
      permissions={permissions}
      onOpen={(id) => onRoute({ mode: "detail", id })}
      onCreate={() => onRoute({ mode: "create" })}
    />
  );
}

function renderPortalScreen({
  screenKey,
  user,
  students,
  activeStudentId,
  onUserChange,
  onSignOut,
}: {
  screenKey: string;
  user: AuthUser;
  students: StudentSummary[];
  activeStudentId: number | null;
  onUserChange: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  const portalTab = isPortalKey(screenKey) ? screenKey : "dashboard";

  if (portalTab === "profile") {
    return (
      <ProfileScreen
        user={user}
        onUserChange={onUserChange}
        onSignOut={onSignOut}
      />
    );
  }

  if (students.length === 0) {
    return <DashboardScreen user={user} students={students} />;
  }

  switch (portalTab) {
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
