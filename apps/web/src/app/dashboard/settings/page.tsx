"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { PermissionGate } from "@/components/PermissionGate";
import { SettingsTabs } from "@/components/SettingsTabs";
import { buttonClasses } from "@/components/Form";
import { Card, PageHeader, StatCard } from "@/components/ui";
import type { SsoProvider } from "@/lib/types";

export default function SettingsPage() {
  return (
    <PermissionGate permission="setting.view">
      <SettingsHome />
    </PermissionGate>
  );
}

function SettingsHome() {
  const { can } = useAuth();
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

      <div className="grid gap-4 sm:grid-cols-3">
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

      <Card className="space-y-4 p-5">
        <p className="text-sm text-muted">
          Single sign-on uses generic OpenID Connect providers. Each provider is
          linked to an institution and can optionally provision users on first
          login with a default role.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/settings/sso-providers"
            className={buttonClasses("secondary")}
          >
            Manage SSO providers
          </Link>
          {can("setting.edit") ? (
            <Link
              href="/dashboard/settings/sso-providers/new"
              className={buttonClasses("primary")}
            >
              New provider
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
