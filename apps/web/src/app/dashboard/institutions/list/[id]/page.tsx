"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
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
          <p className="mt-5 border-t border-border pt-4 text-sm text-muted">
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
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Campuses</h2>
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
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Campuses" className="min-w-[640px]">
              <Table.Header>
                <Table.Column isRowHeader>Campus</Table.Column>
                <Table.Column>Code</Table.Column>
                <Table.Column>Type</Table.Column>
                <Table.Column>Status</Table.Column>
              </Table.Header>
              <Table.Body>
                {items.map((campus) => (
                  <Table.Row key={campus.id} id={campus.id}>
                    <Table.Cell>
                      <Link
                        href={`/dashboard/institutions/campuses/${campus.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {campus.name}
                      </Link>
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {campus.code ?? "-"}
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {campus.type ?? "-"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge value={campus.is_active ? "active" : "inactive"} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </Card>
  );
}
