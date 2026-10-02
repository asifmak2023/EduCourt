import type { AuthUser } from "./api";

export type TabKey =
  | "dashboard"
  | "timetable"
  | "attendance"
  | "results"
  | "fees"
  | "profile";

export interface PortalTab {
  key: TabKey;
  label: string;
  subtitle: string;
}

const PORTAL_TABS: PortalTab[] = [
  { key: "timetable", label: "Timetable", subtitle: "Published class schedule" },
  { key: "attendance", label: "Attendance", subtitle: "Daily records and summary" },
  { key: "results", label: "Results", subtitle: "Exam performance" },
  { key: "fees", label: "Fees", subtitle: "Vouchers and balances" },
];

export function buildTabs(user: AuthUser | null, portal: boolean): PortalTab[] {
  const tabs: PortalTab[] = [
    { key: "dashboard", label: "Dashboard", subtitle: "Overview of your account" },
  ];

  if (user && portal) {
    tabs.push(...PORTAL_TABS);
  }

  tabs.push({ key: "profile", label: "Profile", subtitle: "Photo and personal details" });

  return tabs;
}

export function findTab(tabs: PortalTab[], key: TabKey): PortalTab {
  return tabs.find((tab) => tab.key === key) ?? tabs[0];
}
