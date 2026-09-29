"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { useInstitutions } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { SettingsTabs } from "@/components/SettingsTabs";
import { buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import type { SsoProvider } from "@/lib/types";

export default function SsoProviderDetailPage() {
  return (
    <PermissionGate permission="setting.view">
      <SsoProviderDetail />
    </PermissionGate>
  );
}

function SsoProviderDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error } = useResource<SsoProvider>(
    id ? `/v1/sso-providers/${id}` : null
  );
  const { items: institutions } = useInstitutions();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Provider not found." />;

  const institution = institutions.find(
    (item) => item.id === data.institution_id
  );

  return (
    <div className="space-y-6">
      <SettingsTabs active="sso" />

      <PageHeader
        title={data.name}
        description={`${(data.provider ?? "oidc").toUpperCase()} OpenID Connect`}
        actions={
          <>
            {can("setting.edit") ? (
              <Link
                href={`/dashboard/settings/sso-providers/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/settings/sso-providers"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_active ? "active" : "inactive"} />
        <Badge
          value={data.jit_provisioning ? "jit enabled" : "jit disabled"}
        />
        <Badge
          value={data.has_client_secret ? "secret set" : "no secret"}
        />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem
            label="Institution"
            value={institution ? institution.name : data.institution_id ?? "-"}
          />
          <DataItem label="Client ID" value={data.client_id} />
          <DataItem label="Default role" value={data.default_role ?? "-"} />
          <DataItem label="Scopes" value={data.scopes ?? "-"} />
          <DataItem label="Authorize URL" value={data.authorize_url} />
          <DataItem label="Token URL" value={data.token_url} />
          <DataItem label="Userinfo URL" value={data.userinfo_url} />
          <DataItem label="Logout URL" value={data.logout_url ?? "-"} />
          <DataItem label="Redirect URI" value={data.redirect_uri} />
        </DataList>
      </Card>
    </div>
  );
}
