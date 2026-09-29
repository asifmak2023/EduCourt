"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { SettingsTabs } from "@/components/SettingsTabs";
import { Badge } from "@/components/ui";
import type { SsoProvider } from "@/lib/types";

export default function SsoProvidersPage() {
  const { can } = useAuth();

  return (
    <div className="space-y-6">
      <SettingsTabs active="sso" />
      <MasterList<SsoProvider>
        title="SSO providers"
        description="Generic OpenID Connect providers for single sign-on."
        endpoint="/v1/sso-providers"
        searchable={false}
        createHref={
          can("setting.edit") ? "/dashboard/settings/sso-providers/new" : undefined
        }
        createLabel="New provider"
        editHref={(provider) =>
          `/dashboard/settings/sso-providers/${provider.id}`
        }
        columns={[
          { header: "Name", render: (provider) => provider.name },
          {
            header: "Protocol",
            render: (provider) => (provider.provider ?? "oidc").toUpperCase(),
          },
          { header: "Client ID", render: (provider) => provider.client_id },
          {
            header: "Default role",
            render: (provider) => provider.default_role ?? "-",
          },
          {
            header: "JIT",
            render: (provider) => (
              <Badge value={provider.jit_provisioning ? "enabled" : "disabled"} />
            ),
          },
          {
            header: "Status",
            render: (provider) => (
              <Badge value={provider.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </div>
  );
}
