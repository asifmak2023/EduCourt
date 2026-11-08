"use client";

import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { SettingsTabs } from "@/components/SettingsTabs";
import { HubGrid, type HubSection } from "@/components/ModuleHub";
import { ErrorNotice, PageHeader, StatCard } from "@/components/ui";
import type { SsoProvider } from "@/lib/types";

const SETTINGS_SECTIONS: HubSection[] = [
  {
    href: "/dashboard/settings/sso-providers",
    title: "SSO providers",
    description: "Generic OpenID Connect connections.",
    icon: "shield",
  },
  {
    href: "/dashboard/settings/whatsapp",
    title: "WhatsApp",
    description: "Business number, templates and messaging quota.",
    icon: "message",
  },
  {
    href: "/dashboard/settings/appearance",
    title: "Appearance",
    description: "Color mode, accent and background.",
    icon: "palette",
  },
];

export default function SettingsPage() {
  const { user, can } = useAuth();

  if (!user) {
    return null;
  }

  if (!can("setting.view")) {
    if (can("appearance.view")) {
      return <AppearanceSettingsPanel />;
    }

    return <ErrorNotice message="You do not have permission to view this page." />;
  }

  return <SettingsHome />;
}

function AppearanceSettingsPanel() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Appearance"
        description="Personalize color mode, accent color and background. Preferences are stored in this browser."
      />
      <SettingsTabs active="appearance" />
      <AppearanceSettings />
    </div>
  );
}

function SettingsHome() {
  const { items, meta } = useList<SsoProvider>("/v1/sso-providers", {
    per_page: 50,
  });

  const active = items.filter((provider) => provider.is_active).length;
  const jit = items.filter((provider) => provider.jit_provisioning).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Single sign-on and platform configuration."
      />

      <SettingsTabs active="overview" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="SSO providers"
          value={meta?.total ?? 0}
          hint="Generic OIDC connections"
        />
        <StatCard label="Active providers" value={active} tone="positive" />
        <StatCard
          label="Just-in-time provisioning"
          value={jit}
          hint="Providers that auto-create users"
        />
      </div>

      <HubGrid sections={SETTINGS_SECTIONS} />
    </div>
  );
}
