"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { useAuth } from "@/lib/auth";
import { ApiError, apiFetch } from "@/lib/api";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { AcademicYear } from "@/lib/types";

export default function AcademicYearDetailPage() {
  return (
    <PermissionGate permission="academic.view">
      <YearDetail />
    </PermissionGate>
  );
}

function YearDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useResource<AcademicYear>(
    id ? `/v1/academic-years/${id}` : null
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Academic year not found." />;

  const terms = data.terms ?? [];

  const remove = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/v1/academic-years/${data.id}`, { method: "DELETE" });
      router.push("/dashboard/academics/academic-years");
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to archive year."
      );
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={`Code ${data.code}`}
        actions={
          <>
            <Link
              href="/dashboard/academics/academic-years"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("academic.edit") ? (
              <Link
                href={`/dashboard/academics/academic-years/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        {data.is_current ? <Badge value="active" /> : null}
      </div>

      {actionError ? <ErrorNotice message={actionError} /> : null}

      <SectionCard title="Details">
        <DataList>
          <DataItem label="Starts on" value={formatDate(data.starts_on)} />
          <DataItem label="Ends on" value={formatDate(data.ends_on)} />
          <DataItem label="Terms" value={String(terms.length)} />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {data.notes}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Terms"
        description="Terms split the academic year into teaching blocks."
        actions={
          can("academic.create") ? (
            <Link
              href={`/dashboard/academics/terms/new?academic_year_id=${data.id}`}
              className={buttonClasses()}
            >
              New term
            </Link>
          ) : null
        }
      >
        {terms.length === 0 ? (
          <EmptyState message="No terms have been added to this year." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Sequence</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Dates</th>
                  <th className="px-4 py-2 font-medium">Current</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {terms.map((term) => (
                  <tr key={term.id}>
                    <td className="px-4 py-2 text-slate-500">
                      {term.sequence}
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {can("academic.edit") ? (
                        <Link
                          href={`/dashboard/academics/terms/${term.id}/edit`}
                          className="hover:underline"
                        >
                          {term.name}
                        </Link>
                      ) : (
                        term.name
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {formatDate(term.starts_on)} - {formatDate(term.ends_on)}
                    </td>
                    <td className="px-4 py-2">
                      {term.is_current ? <Badge value="active" /> : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {can("academic.delete") ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Archive</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Archived years are removed from the active lists.
              </p>
            </div>
            <Button
              variant="danger"
              type="button"
              loading={busy}
              onClick={remove}
            >
              Archive year
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
