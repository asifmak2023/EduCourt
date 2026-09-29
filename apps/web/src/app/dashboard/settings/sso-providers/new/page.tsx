"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { SettingsTabs } from "@/components/SettingsTabs";
import { SsoProviderForm } from "@/components/SsoProviderForm";

export default function NewSsoProviderPage() {
  return (
    <PermissionGate permission="setting.edit">
      <div className="space-y-6">
        <SettingsTabs active="sso" />
        <SsoProviderForm
          title="New SSO provider"
          description="Connect an OpenID Connect identity provider."
          redirectTo="/dashboard/settings/sso-providers"
          initial={{
            institution_id: "",
            name: "",
            provider: "oidc",
            client_id: "",
            authorize_url: "",
            token_url: "",
            userinfo_url: "",
            logout_url: "",
            redirect_uri: "",
            scopes: "openid profile email",
            default_role: "",
            is_active: true,
            jit_provisioning: false,
          }}
        />
      </div>
    </PermissionGate>
  );
}
