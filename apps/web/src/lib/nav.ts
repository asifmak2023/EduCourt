import { AR_VIEW } from "./permissions";

export type NavIcon =
  | "grid"
  | "users"
  | "userPlus"
  | "award"
  | "arrowUp"
  | "building"
  | "calendar"
  | "check"
  | "clipboard"
  | "book"
  | "chart"
  | "receipt"
  | "list"
  | "banknote"
  | "idCard"
  | "wallet"
  | "clock"
  | "box"
  | "bus"
  | "bed"
  | "trophy"
  | "heart"
  | "message"
  | "megaphone"
  | "bell"
  | "shield"
  | "cog"
  | "history"
  | "creditCard"
  | "chevronDown"
  | "palette"
  | "sun"
  | "moon"
  | "sparkles"
  | "eye"
  | "eyeOff"
  | "panelLeft"
  | "logout";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  permission: string | string[] | null;
  ready: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "navigation.section.overview",
    collapsible: false,
    items: [
      { label: "navigation.dashboard", href: "/dashboard", icon: "grid", permission: null, ready: true },
      { label: "navigation.profile", href: "/dashboard/profile", icon: "idCard", permission: null, ready: true },
    ],
  },
  {
    label: "navigation.section.admissions",
    items: [
      { label: "navigation.admissions", href: "/dashboard/admissions", icon: "userPlus", permission: "admission.view", ready: true },
      { label: "navigation.students", href: "/dashboard/students", icon: "users", permission: "student.view", ready: true },
      { label: "navigation.scholarships", href: "/dashboard/scholarships", icon: "award", permission: "scholarship.view", ready: true },
      { label: "navigation.promotions", href: "/dashboard/promotions", icon: "arrowUp", permission: "student.edit", ready: true },
    ],
  },
  {
    label: "navigation.section.academics",
    items: [
      { label: "navigation.academicStructure", href: "/dashboard/academics", icon: "building", permission: "academic.view", ready: true },
      { label: "navigation.timetable", href: "/dashboard/timetable", icon: "calendar", permission: "timetable.view", ready: true },
      { label: "navigation.attendance", href: "/dashboard/attendance", icon: "check", permission: "attendance.view", ready: true },
      { label: "navigation.exams", href: "/dashboard/exams", icon: "clipboard", permission: "exam.view", ready: true },
      { label: "navigation.curriculum", href: "/dashboard/curriculum", icon: "book", permission: "curriculum.view", ready: true },
      { label: "navigation.credits", href: "/dashboard/credits", icon: "chart", permission: "credit.view", ready: true },
    ],
  },
  {
    label: "navigation.section.finance",
    items: [
      { label: "navigation.financeOverview", href: "/dashboard/finance", icon: "grid", permission: AR_VIEW, ready: true },
      { label: "navigation.accountsReceivable", href: "/dashboard/finance/accounts-receivable", icon: "receipt", permission: AR_VIEW, ready: true },
      { label: "navigation.feeStructure", href: "/dashboard/finance/accounts-receivable/fee-structure", icon: "clipboard", permission: "fee.view", ready: true },
      { label: "navigation.generateVoucher", href: "/dashboard/finance/accounts-receivable/generate-voucher", icon: "receipt", permission: AR_VIEW, ready: true },
      { label: "navigation.arReports", href: "/dashboard/finance/accounts-receivable/reports", icon: "chart", permission: AR_VIEW, ready: true },
      { label: "navigation.receipts", href: "/dashboard/finance/accounts-receivable/receipts", icon: "receipt", permission: AR_VIEW, ready: true },
      { label: "navigation.feeHeads", href: "/dashboard/finance/fee-heads", icon: "list", permission: "fee.view", ready: true },
      { label: "navigation.chartOfAccounts", href: "/dashboard/finance/accounts", icon: "list", permission: "finance.view", ready: true },
      { label: "navigation.journal", href: "/dashboard/finance/journal", icon: "list", permission: "finance.view", ready: true },
      { label: "navigation.trialBalance", href: "/dashboard/finance/trial-balance", icon: "chart", permission: "finance.view", ready: true },
      { label: "navigation.expenses", href: "/dashboard/finance/expenses", icon: "banknote", permission: "finance.view", ready: true },
      { label: "navigation.vendors", href: "/dashboard/finance/vendors", icon: "building", permission: "finance.view", ready: true },
      { label: "navigation.expenseCategories", href: "/dashboard/finance/expense-categories", icon: "list", permission: "finance.view", ready: true },
      { label: "navigation.budgets", href: "/dashboard/finance/budgets", icon: "chart", permission: "finance.view", ready: true },
      { label: "navigation.reports", href: "/dashboard/reports", icon: "chart", permission: "report.view", ready: true },
    ],
  },
  {
    label: "navigation.section.people",
    items: [
      { label: "navigation.staff", href: "/dashboard/hr/staff", icon: "idCard", permission: "hr.view", ready: true },
      { label: "navigation.payroll", href: "/dashboard/hr/payroll", icon: "wallet", permission: "payroll.view", ready: true },
      { label: "navigation.leave", href: "/dashboard/attendance/leave", icon: "clock", permission: "attendance.view", ready: true },
    ],
  },
  {
    label: "navigation.section.operations",
    items: [
      { label: "navigation.inventory", href: "/dashboard/inventory", icon: "box", permission: "inventory.view", ready: true },
      { label: "navigation.library", href: "/dashboard/library", icon: "book", permission: "library.view", ready: true },
      { label: "navigation.labs", href: "/dashboard/labs", icon: "box", permission: "lab.view", ready: true },
      { label: "navigation.transport", href: "/dashboard/transport", icon: "bus", permission: "transport.view", ready: true },
      { label: "navigation.hostel", href: "/dashboard/hostel", icon: "bed", permission: "hostel.view", ready: true },
      { label: "navigation.canteen", href: "/dashboard/canteen", icon: "box", permission: "canteen.view", ready: true },
      { label: "navigation.sports", href: "/dashboard/sports", icon: "trophy", permission: "sports.view", ready: true },
      { label: "navigation.studentAffairs", href: "/dashboard/student-affairs", icon: "heart", permission: "student_affairs.view", ready: true },
      { label: "navigation.complaints", href: "/dashboard/student-affairs/complaints", icon: "message", permission: "complaint.view", ready: true },
      { label: "navigation.circulars", href: "/dashboard/circulars", icon: "megaphone", permission: "circular.view", ready: true },
      { label: "navigation.notifications", href: "/dashboard/notifications", icon: "bell", permission: "notification.view", ready: true },
    ],
  },
  {
    label: "navigation.section.administration",
    items: [
      { label: "navigation.users", href: "/dashboard/users", icon: "users", permission: "user.view", ready: true },
      { label: "navigation.roles", href: "/dashboard/roles", icon: "shield", permission: "role.view", ready: true },
      { label: "navigation.settings", href: "/dashboard/settings", icon: "cog", permission: "appearance.view", ready: true },
      { label: "navigation.audit", href: "/dashboard/audit", icon: "history", permission: "audit.view", ready: true },
      { label: "navigation.institutions", href: "/dashboard/institutions", icon: "building", permission: "institution.view", ready: true },
    ],
  },
];

export function can(
  userPermissions: string[],
  permission: string | string[] | null
): boolean {
  if (permission === null) {
    return true;
  }

  const required = Array.isArray(permission) ? permission : [permission];

  return required.some((entry) => userPermissions.includes(entry));
}

export function visibleSections(userPermissions: string[]): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    label: section.label,
    collapsible: section.collapsible,
    items: section.items.filter((item) => can(userPermissions, item.permission)),
  })).filter((section) => section.items.length > 0);
}

export function findNavItem(pathname: string): NavItem | null {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === pathname) {
        return item;
      }
    }
  }

  return null;
}

export function sectionForPath(pathname: string): NavSection | null {
  let best: NavSection | null = null;
  let bestLength = 0;

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (
        (pathname === item.href || pathname.startsWith(`${item.href}/`)) &&
        item.href.length >= bestLength
      ) {
        best = section;
        bestLength = item.href.length;
      }
    }
  }

  return best;
}
