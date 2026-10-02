"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/Form";
import { useAuth } from "@/lib/auth";

export const SETTINGS_TABS = [
  {
    key: "overview",
    href: "/dashboard/settings",
    label: "Overview",
    permission: "setting.view",
  },
  {
    key: "sso",
    href: "/dashboard/settings/sso-providers",
    label: "SSO providers",
    permission: "setting.view",
  },
  {
    key: "appearance",
    href: "/dashboard/settings/appearance",
    label: "Appearance",
    permission: "appearance.view",
  },
];

export function SettingsTabs({ active }: { active: string }) {
  const { can } = useAuth();
  const tabs = SETTINGS_TABS.filter((tab) => can(tab.permission));

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={buttonClasses(tab.key === active ? "primary" : "secondary")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
