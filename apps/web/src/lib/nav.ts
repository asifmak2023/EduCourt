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
  | "shield"
  | "cog"
  | "history"
  | "creditCard";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  permission: string | null;
  ready: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "grid", permission: null, ready: true },
    ],
  },
  {
    label: "Admissions & Students",
    items: [
      { label: "Admissions", href: "/dashboard/admissions", icon: "userPlus", permission: "admission.view", ready: true },
      { label: "Students", href: "/dashboard/students", icon: "users", permission: "student.view", ready: true },
      { label: "Scholarships", href: "/dashboard/scholarships", icon: "award", permission: "scholarship.view", ready: true },
      { label: "Promotions", href: "/dashboard/promotions", icon: "arrowUp", permission: "student.edit", ready: true },
    ],
  },
  {
    label: "Academics",
    items: [
      { label: "Academic structure", href: "/dashboard/academics", icon: "building", permission: "academic.view", ready: true },
      { label: "Timetable", href: "/dashboard/timetable", icon: "calendar", permission: "timetable.view", ready: true },
      { label: "Attendance", href: "/dashboard/attendance", icon: "check", permission: "attendance.view", ready: true },
      { label: "Exams & results", href: "/dashboard/exams", icon: "clipboard", permission: "exam.view", ready: true },
      { label: "Curriculum", href: "/dashboard/curriculum", icon: "book", permission: "curriculum.view", ready: true },
      { label: "Credits & GPA", href: "/dashboard/credits", icon: "chart", permission: "credit.view", ready: true },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Fee vouchers", href: "/dashboard/fees", icon: "receipt", permission: "fee.view", ready: true },
      { label: "Fee payments", href: "/dashboard/fees/payments", icon: "banknote", permission: "fee.view", ready: true },
      { label: "Chart of accounts", href: "/dashboard/finance/accounts", icon: "list", permission: "finance.view", ready: true },
      { label: "Journal", href: "/dashboard/finance/journal", icon: "list", permission: "finance.view", ready: true },
      { label: "Trial balance", href: "/dashboard/finance/trial-balance", icon: "chart", permission: "finance.view", ready: true },
      { label: "Expenses", href: "/dashboard/finance/expenses", icon: "banknote", permission: "finance.view", ready: true },
      { label: "Vendors", href: "/dashboard/finance/vendors", icon: "building", permission: "finance.view", ready: true },
      { label: "Expense categories", href: "/dashboard/finance/expense-categories", icon: "list", permission: "finance.view", ready: true },
      { label: "Budgets", href: "/dashboard/finance/budgets", icon: "chart", permission: "finance.view", ready: true },
      { label: "Reports", href: "/dashboard/reports", icon: "chart", permission: "report.view", ready: true },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Staff", href: "/dashboard/hr/staff", icon: "idCard", permission: "hr.view", ready: true },
      { label: "Payroll", href: "/dashboard/hr/payroll", icon: "wallet", permission: "payroll.view", ready: true },
      { label: "Leave", href: "/dashboard/attendance/leave", icon: "clock", permission: "attendance.view", ready: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Inventory", href: "/dashboard/inventory", icon: "box", permission: "inventory.view", ready: true },
      { label: "Library", href: "/dashboard/library", icon: "book", permission: "library.view", ready: true },
      { label: "Labs", href: "/dashboard/labs", icon: "box", permission: "lab.view", ready: true },
      { label: "Transport", href: "/dashboard/transport", icon: "bus", permission: "transport.view", ready: true },
      { label: "Hostel", href: "/dashboard/hostel", icon: "bed", permission: "hostel.view", ready: true },
      { label: "Canteen", href: "/dashboard/canteen", icon: "box", permission: "canteen.view", ready: true },
      { label: "Sports", href: "/dashboard/sports", icon: "trophy", permission: "sports.view", ready: true },
      { label: "Student affairs", href: "/dashboard/student-affairs", icon: "heart", permission: "student_affairs.view", ready: true },
      { label: "Complaints", href: "/dashboard/student-affairs/complaints", icon: "message", permission: "complaint.view", ready: true },
      { label: "Circulars", href: "/dashboard/circulars", icon: "megaphone", permission: "circular.view", ready: true },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/dashboard/users", icon: "users", permission: "user.view", ready: true },
      { label: "Roles & scopes", href: "/dashboard/roles", icon: "shield", permission: "role.view", ready: true },
      { label: "Settings", href: "/dashboard/settings", icon: "cog", permission: "setting.view", ready: true },
      { label: "Audit log", href: "/dashboard/audit", icon: "history", permission: "audit.view", ready: true },
      { label: "Institutions", href: "/dashboard/institutions", icon: "building", permission: "institution.view", ready: true },
    ],
  },
];

export function can(userPermissions: string[], permission: string | null): boolean {
  if (permission === null) {
    return true;
  }

  return userPermissions.includes(permission);
}

export function visibleSections(userPermissions: string[]): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    label: section.label,
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
