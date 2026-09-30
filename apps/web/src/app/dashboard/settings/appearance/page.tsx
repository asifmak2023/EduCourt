"use client";

import { AppearanceSettings } from "@/components/AppearanceSettings";
import { SettingsTabs } from "@/components/SettingsTabs";
import { PageHeader } from "@/components/ui";

export default function AppearanceSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Appearance"
        description="Personalize color mode, accent color and background. Preferences are stored in this browser."
      />
      <SettingsTabs active="appearance" />
      <AppearanceSettings />
    </div>
  );
}
