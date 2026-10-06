"use client";

import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { buttonClasses } from "@/components/Form";
import { formatCurrency } from "@/lib/format";
import type { FeeStructure } from "@/lib/types";

export default function FeeStructurePage() {
  return (
    <PermissionGate permission="fee.view">
      <FeeStructureTable />
    </PermissionGate>
  );
}

function FeeStructureTable() {
  const { can } = useAuth();

  const { items, meta, loading, error, page, setPage } =
    useList<FeeStructure>("/v1/fee-structures");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee structure"
        description="Monthly, exam and one-time charges by academic year and class."
        actions={
          can("fee.create") ? (
            <Link
              href="/dashboard/finance/accounts-receivable/fee-structure/new"
              className={buttonClasses()}
            >
              New fee structure
            </Link>
          ) : null
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No fee structures yet. Create one to start billing." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Fee structures" className="min-w-[760px]">
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Academic year</Table.Column>
                  <Table.Column>Class</Table.Column>
                  <Table.Column>Monthly total</Table.Column>
                  <Table.Column>Items</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((structure) => (
                    <Table.Row key={structure.id} id={structure.id}>
                      <Table.Cell className="font-medium text-foreground">
                        {can("fee.edit") ? (
                          <Link
                            href={`/dashboard/finance/accounts-receivable/fee-structure/${structure.id}/edit`}
                            className="hover:underline"
                          >
                            {structure.name}
                          </Link>
                        ) : (
                          structure.name
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {structure.academic_year?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {structure.class_room?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {structure.monthly_total != null
                          ? formatCurrency(structure.monthly_total)
                          : "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {structure.items?.length ?? 0}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          value={structure.is_active === false ? "inactive" : "active"}
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {meta ? (
          <Pagination
            page={page}
            lastPage={meta.last_page}
            total={meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
