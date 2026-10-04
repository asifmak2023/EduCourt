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

  const overviewItems: NavItem[] = [
    {
      key: "dashboard",
      label: "navigation.dashboard",
      subtitle: "navigation.subtitle.dashboard",
    },
  ];

  if (isStaffUser(user) && can(permissions, "report.view")) {
    overviewItems.push({
      key: "analytics",
      label: "Analytics",
      subtitle: "Overview",
      permission: "report.view",
      customScreen: "analytics",
    });
  }

  sections.push({
    label: "navigation.section.overview",
    items: overviewItems,
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

    const operationsReports = [
      "inventory.view",
      "library.view",
      "transport.view",
      "sports.view",
      "canteen.view",
    ];
    if (operationsReports.some((permission) => can(permissions, permission))) {
      const list = groups.get("Operations") ?? [];
      list.push({
        key: "operations-reports",
        label: "Operations reports",
        subtitle: "Operations",
        permission: null,
        customScreen: "operationsReports",
      });
      groups.set("Operations", list);
    }

    if (can(permissions, "notification.view")) {
      const list = groups.get("Operations") ?? [];
      list.push({
        key: "notifications",
        label: "navigation.notifications",
        subtitle: "Operations",
        permission: "notification.view",
        customScreen: "notifications",
      });
      groups.set("Operations", list);
    }

    if (can(permissions, "attendance.create")) {
      const list = groups.get("Academics") ?? [];
      list.push({
        key: "student-attendance-mark",
        label: "Mark student attendance",
        subtitle: "Academics",
        permission: "attendance.create",
        customScreen: "studentAttendanceMark",
      });
      list.push({
        key: "staff-attendance-mark",
        label: "Mark staff attendance",
        subtitle: "Academics",
        permission: "attendance.create",
        customScreen: "staffAttendanceMark",
      });
      groups.set("Academics", list);
    }

    if (can(permissions, "attendance.view")) {
      const list = groups.get("Academics") ?? [];
      list.push({
        key: "attendance-reports",
        label: "Attendance reports",
        subtitle: "Academics",
        permission: "attendance.view",
        customScreen: "attendanceReports",
      });
      groups.set("Academics", list);
    }

    if (can(permissions, "timetable.view")) {
      const list = groups.get("Academics") ?? [];
      list.push({
        key: "timetable-grid",
        label: "Timetable",
        subtitle: "Academics",
        permission: "timetable.view",
        customScreen: "timetableGrid",
      });
      groups.set("Academics", list);
    }

    if (can(permissions, "exam.view")) {
      const list = groups.get("Academics") ?? [];
      list.push({
        key: "exam-result-card",
        label: "Result card",
        subtitle: "Academics",
        permission: "exam.view",
        customScreen: "resultCard",
      });
      list.push({
        key: "exam-merit-list",
        label: "Merit list",
        subtitle: "Academics",
        permission: "exam.view",
        customScreen: "meritList",
      });
      groups.set("Academics", list);
    }

    if (can(permissions, "credit.view")) {
      const list = groups.get("Academics") ?? [];
      list.push({
        key: "transcript",
        label: "Transcript",
        subtitle: "Academics",
        permission: "credit.view",
        customScreen: "transcript",
      });
      groups.set("Academics", list);
    }

    if (can(permissions, "role.view")) {
      const list = groups.get("Administration") ?? [];
      list.push({
        key: "role-scopes",
        label: "Roles & scopes",
        subtitle: "Administration",
        permission: "role.view",
        customScreen: "roles",
      });
      groups.set("Administration", list);
    }

    if (can(permissions, "audit.view")) {
      const list = groups.get("Administration") ?? [];
      list.push({
        key: "audit-log",
        label: "Audit log",
        subtitle: "Administration",
        permission: "audit.view",
        customScreen: "auditLog",
      });
      groups.set("Administration", list);
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
