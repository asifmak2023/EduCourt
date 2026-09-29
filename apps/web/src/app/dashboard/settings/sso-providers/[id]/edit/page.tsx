"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { SettingsTabs } from "@/components/SettingsTabs";
import { SsoProviderForm } from "@/components/SsoProviderForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { SsoProvider } from "@/lib/types";

export default function EditSsoProviderPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<SsoProvider>(
    id ? `/v1/sso-providers/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Provider not found." />;

  return (
    <PermissionGate permission="setting.edit">
      <div className="space-y-6">
        <SettingsTabs active="sso" />
        <SsoProviderForm
          title="Edit SSO provider"
          description={data.name}
          recordId={data.id}
          redirectTo={`/dashboard/settings/sso-providers/${data.id}`}
          initial={{
            institution_id: data.institution_id
              ? String(data.institution_id)
              : "",
            name: data.name,
            provider: data.provider ?? "oidc",
            client_id: data.client_id,
            authorize_url: data.authorize_url,
            token_url: data.token_url,
            userinfo_url: data.userinfo_url,
            logout_url: data.logout_url ?? "",
            redirect_uri: data.redirect_uri,
            scopes: data.scopes ?? "",
            default_role: data.default_role ?? "",
            is_active: data.is_active,
            jit_provisioning: data.jit_provisioning,
          }}
        />
      </div>
    </PermissionGate>
  );
}
