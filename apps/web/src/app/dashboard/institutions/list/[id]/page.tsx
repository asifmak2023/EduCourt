"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
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
import type { Campus, Institution } from "@/lib/types";

export default function InstitutionDetailPage() {
  return (
    <PermissionGate permission="institution.view">
      <InstitutionDetail />
    </PermissionGate>
  );
}

function InstitutionDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error } = useResource<Institution>(
    id ? `/v1/institutions/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Institution not found." />;

  return (
    <div className="space-y-6">
      <InstitutionsTabs active="institutions" />

      <PageHeader
        title={data.name}
        description={data.code ?? undefined}
        actions={
          <>
            {can("institution.edit") ? (
              <Link
                href={`/dashboard/institutions/list/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/institutions/list"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_active ? "active" : "inactive"} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Legal name" value={data.legal_name ?? "-"} />
          <DataItem label="Email" value={data.email ?? "-"} />
          <DataItem label="Phone" value={data.phone ?? "-"} />
          <DataItem label="Website" value={data.website ?? "-"} />
          <DataItem label="Campuses" value={data.campuses_count ?? "-"} />
        </DataList>
        {data.address ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {data.address}
          </p>
        ) : null}
      </Card>

      <InstitutionCampuses institutionId={data.id} />
    </div>
  );
}

function InstitutionCampuses({ institutionId }: { institutionId: number }) {
  const { items, loading, error } = useList<Campus>("/v1/campuses", {
    institution_id: institutionId,
    per_page: 25,
  });

  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Campuses</h2>
      </div>
      {error ? (
        <div className="p-5">
          <ErrorNotice message={error} />
        </div>
      ) : loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState message="No campuses under this institution." />
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Campus</th>
              <th className="px-5 py-3 font-medium">Code</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((campus) => (
              <tr key={campus.id}>
                <td className="px-5 py-3">
                  <Link
                    href={`/dashboard/institutions/campuses/${campus.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {campus.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {campus.code ?? "-"}
                </td>
                <td className="px-5 py-3 text-slate-600">{campus.type ?? "-"}</td>
                <td className="px-5 py-3">
                  <Badge value={campus.is_active ? "active" : "inactive"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
