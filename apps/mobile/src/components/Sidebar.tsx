import { useEffect, useState } from "react";
import { useTranslation } from "@eis/i18n";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Avatar } from "./Avatar";
import { ChildSelector } from "./ChildSelector";
import { SectionLabel } from "./ui";
import { useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "../theme/colors";
import { useCampus } from "../lib/campus";
import { useTr } from "../lib/i18n";
import type { NavItem, NavSection } from "../lib/nav";
import type { AuthUser, StudentSummary } from "../lib/api";

export const SIDEBAR_WIDTH = 280;

interface SidebarProps {
  wide: boolean;
  open: boolean;
  user: AuthUser;
  sections: NavSection[];
  activeKey: string;
  students: StudentSummary[];
  activeStudentId: number | null;
  onClose: () => void;
  onSelectItem: (item: NavItem) => void;
  onSelectStudent: (id: number) => void;
  onAppearance: () => void;
  onSignOut: () => void;
}

export function Sidebar({
  wide,
  open,
  user,
  sections,
  activeKey,
  students,
  activeStudentId,
  onClose,
  onSelectItem,
  onSelectStudent,
  onAppearance,
  onSignOut,
}: SidebarProps) {
  const { colors, config } = useTheme();
  const { t } = useTranslation();
  const tr = useTr();
  const { campuses, campusId, setCampusId, canSwitch } = useCampus();
  const [translateX] = useState(
    () => new Animated.Value(wide ? 0 : -SIDEBAR_WIDTH)
  );
  const [backdrop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (wide) {
      translateX.setValue(0);
      backdrop.setValue(0);
      return;
    }

    Animated.timing(translateX, {
      toValue: open ? 0 : -SIDEBAR_WIDTH,
      duration: 220,
      useNativeDriver: false,
    }).start();

    Animated.timing(backdrop, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [open, wide, translateX, backdrop]);

  const panel = (
    <View style={styles.panel}>
      <View style={[styles.userBlock, { borderColor: colors.border }]}>
        <Avatar name={user.name} photoUrl={user.photo_url} />
        <View style={styles.userText}>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
            {user.campus?.name ?? user.institution?.name ?? user.email}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {canSwitch ? (
          <View style={styles.group}>
            <SectionLabel>{t("navigation.campus")}</SectionLabel>
            <View style={styles.campusRow}>
              {campuses.map((campus) => {
                const active = campus.id === campusId;
                return (
                  <Pressable
                    key={campus.id}
                    onPress={() => setCampusId(campus.id)}
                    accessibilityRole="button"
                    style={[
                      styles.campusChip,
                      {
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accentSoft : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{ color: active ? colors.accent : colors.foreground, fontSize: 12 }}
                      numberOfLines={1}
                    >
                      {campus.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {students.length > 1 ? (
          <View style={styles.group}>
            <SectionLabel>{t("navigation.student")}</SectionLabel>
            <ChildSelector
              students={students}
              activeId={activeStudentId}
              onSelect={onSelectStudent}
            />
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.label} style={styles.group}>
            <SectionLabel>{tr(section.label)}</SectionLabel>
            <View style={styles.nav}>
              {section.items.map((item) => {
                const active = item.key === activeKey;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => onSelectItem(item)}
                    accessibilityRole="button"
                    style={[
                      styles.navItem,
                      active ? { backgroundColor: colors.accentSoft } : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.navBar,
                        { backgroundColor: active ? colors.accent : "transparent" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        { color: active ? colors.accent : colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {tr(item.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderColor: colors.border }]}>
        <Pressable
          onPress={() => {
            onAppearance();
            onClose();
          }}
          accessibilityRole="button"
          style={[styles.footerButton, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>
            {t("appearance.title")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            onSignOut();
            onClose();
          }}
          accessibilityRole="button"
          style={[styles.footerButton, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.danger, fontWeight: "600" }}>
            {t("common.signOut")}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const panelStyle = {
    backgroundColor: config.glass ? colors.glassSurfaceSecondary : colors.surface,
    borderColor: colors.border,
  };

  if (wide) {
    return <View style={[styles.wide, panelStyle]}>{panel}</View>;
  }

  return (
    <>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          {
            opacity: backdrop,
            backgroundColor: withAlpha("#000000", 0.4),
            pointerEvents: open ? "auto" : "none",
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, panelStyle, { transform: [{ translateX }] }]}
      >
        {panel}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wide: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    zIndex: 20,
    elevation: 12,
  },
  backdrop: {
    zIndex: 10,
  },
  panel: {
    flex: 1,
    paddingTop: 56,
  },
  userBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  userText: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 8,
  },
  group: {
    marginBottom: 20,
  },
  campusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  campusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 220,
  },
  nav: {
    marginTop: 8,
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 11,
    paddingRight: 12,
  },
  navBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    marginRight: 13,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 18,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
});
