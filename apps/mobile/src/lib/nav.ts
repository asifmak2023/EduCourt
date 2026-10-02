import type { MessageKey } from "@eis/i18n";
import type { AuthUser } from "./api";
import { MODULES } from "../admin/registry";

export type PortalTabKey =
  | "dashboard"
  | "timetable"
  | "attendance"
  | "results"
  | "fees"
  | "profile";

export interface NavItem {
  key: string;
  label: string;
  subtitle: string;
  permission?: string | null;
  moduleKey?: string;
  customScreen?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const PORTAL_KEY_PREFIX = "mod:";

const PORTAL_ROLES = new Set(["student", "parent_guardian"]);

export function isStaffUser(user: AuthUser | null): boolean {
  const roles = user?.roles ?? [];
  return roles.some((role) => !PORTAL_ROLES.has(role));
}

export function can(permissions: string[], permission?: string | null): boolean {
  if (!permission) {
    return true;
  }
  return permissions.includes(permission);
}

const PORTAL_ITEMS: NavItem[] = [
  {
    key: "timetable",
    label: "navigation.timetable",
    subtitle: "navigation.subtitle.timetable",
  },
  {
    key: "attendance",
    label: "navigation.attendance",
    subtitle: "navigation.subtitle.attendance",
  },
  {
    key: "results",
    label: "navigation.results",
    subtitle: "navigation.subtitle.results",
  },
  {
    key: "fees",
    label: "navigation.fees",
    subtitle: "navigation.subtitle.fees",
  },
];

const STAFF_ORDER = [
  "Admissions & Students",
  "Academics",
  "Finance",
  "People",
  "Operations",
  "Administration",
];

const SECTION_KEYS: Record<string, MessageKey> = {
  "Admissions & Students": "navigation.section.admissions",
  Academics: "navigation.section.academics",
  Finance: "navigation.section.finance",
  People: "navigation.section.people",
  Operations: "navigation.section.operations",
  Administration: "navigation.section.administration",
};

function sectionLabel(name: string): string {
  return SECTION_KEYS[name] ?? name;
}

export function buildNav(user: AuthUser | null, portal: boolean): NavSection[] {
  const permissions = user?.permissions ?? [];
  const sections: NavSection[] = [];

  sections.push({
    label: "navigation.section.overview",
    items: [
      {
        key: "dashboard",
        label: "navigation.dashboard",
        subtitle: "navigation.subtitle.dashboard",
      },
    ],
  });

  if (portal) {
    sections.push({ label: "navigation.section.myPortal", items: PORTAL_ITEMS });
  }

  const groups = new Map<string, NavItem[]>();
  if (isStaffUser(user)) {
    for (const module of MODULES) {
      if (!can(permissions, module.permissions.view)) {
        continue;
      }
      const item: NavItem = {
        key: `${PORTAL_KEY_PREFIX}${module.key}`,
        label: module.label,
        subtitle: module.section,
        moduleKey: module.key,
      };
      const list = groups.get(module.section) ?? [];
      list.push(item);
      groups.set(module.section, list);
    }

    if (can(permissions, "student.edit")) {
      const list = groups.get("Admissions & Students") ?? [];
      list.push({
        key: "promotions",
        label: "navigation.promotions",
        subtitle: "navigation.subtitle.promotions",
        permission: "student.edit",
        customScreen: "promotions",
      });
      groups.set("Admissions & Students", list);
    }

    if (can(permissions, "fee.view")) {
      const list = groups.get("Finance") ?? [];
      list.push({
        key: "fee-reports",
        label: "navigation.feeReports",
        subtitle: "navigation.subtitle.feeReports",
        permission: "fee.view",
        customScreen: "feeReports",
      });
      groups.set("Finance", list);
    }

    if (can(permissions, "finance.view")) {
      const list = groups.get("Finance") ?? [];
      list.push({
        key: "finance-reports",
        label: "navigation.financeReports",
        subtitle: "navigation.subtitle.financeReports",
        permission: "finance.view",
        customScreen: "financeReports",
      });
      groups.set("Finance", list);
    }
  }

  for (const name of [...STAFF_ORDER, ...groups.keys()]) {
    const items = groups.get(name);
    if (items?.length) {
      sections.push({ label: sectionLabel(name), items });
    }
    groups.delete(name);
  }
  for (const [name, items] of groups) {
    sections.push({ label: sectionLabel(name), items });
  }

  sections.push({
    label: "navigation.section.account",
    items: [
      {
        key: "profile",
        label: "navigation.profile",
        subtitle: "navigation.subtitle.profile",
      },
    ],
  });

  return sections;
}

export function findNavItem(sections: NavSection[], key: string): NavItem | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (item.key === key) {
        return item;
      }
    }
  }
  return null;
}

export function isPortalKey(key: string): key is PortalTabKey {
  return (
    key === "dashboard" ||
    key === "timetable" ||
    key === "attendance" ||
    key === "results" ||
    key === "fees" ||
    key === "profile"
  );
}
