"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/Form";

export const SETTINGS_TABS = [
  { key: "overview", href: "/dashboard/settings", label: "Overview" },
  {
    key: "sso",
    href: "/dashboard/settings/sso-providers",
    label: "SSO providers",
  },
  {
    key: "appearance",
    href: "/dashboard/settings/appearance",
    label: "Appearance",
  },
];

export function SettingsTabs({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {SETTINGS_TABS.map((tab) => (
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
