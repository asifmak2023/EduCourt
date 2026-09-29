"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";
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
import type { Campus } from "@/lib/types";

export default function CampusDetailPage() {
  return (
    <PermissionGate permission="campus.view">
      <CampusDetail />
    </PermissionGate>
  );
}

function CampusDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error } = useResource<Campus>(
    id ? `/v1/campuses/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Campus not found." />;

  return (
    <div className="space-y-6">
      <InstitutionsTabs active="campuses" />

      <PageHeader
        title={data.name}
        description={data.code ?? undefined}
        actions={
          <>
            {can("campus.edit") ? (
              <Link
                href={`/dashboard/institutions/campuses/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/institutions/campuses"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.type ?? "campus"} />
        <Badge value={data.is_active ? "active" : "inactive"} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem
            label="Institution"
            value={
              data.institution ? (
                <Link
                  href={`/dashboard/institutions/list/${data.institution.id}`}
                  className="text-slate-900 hover:underline"
                >
                  {data.institution.name}
                </Link>
              ) : (
                "-"
              )
            }
          />
          <DataItem label="Email" value={data.email ?? "-"} />
          <DataItem label="Phone" value={data.phone ?? "-"} />
          <DataItem label="WhatsApp" value={data.whatsapp ?? "-"} />
          <DataItem label="Website" value={data.website ?? "-"} />
        </DataList>
        {data.address ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {data.address}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
