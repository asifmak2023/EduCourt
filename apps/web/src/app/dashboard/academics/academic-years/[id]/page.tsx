"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Table } from "@heroui/react";
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
          <p className="mt-5 border-t border-border pt-4 text-sm text-muted">
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
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Terms" className="min-w-[640px]">
                <Table.Header>
                  <Table.Column isRowHeader>Sequence</Table.Column>
                  <Table.Column>Name</Table.Column>
                  <Table.Column>Dates</Table.Column>
                  <Table.Column>Current</Table.Column>
                </Table.Header>
                <Table.Body>
                  {terms.map((term) => (
                    <Table.Row key={term.id} id={term.id}>
                      <Table.Cell className="text-muted">
                        {term.sequence}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
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
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(term.starts_on)} - {formatDate(term.ends_on)}
                      </Table.Cell>
                      <Table.Cell>
                        {term.is_current ? <Badge value="active" /> : "-"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </SectionCard>

      {can("academic.delete") ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Archive</h2>
              <p className="mt-0.5 text-xs text-muted">
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
