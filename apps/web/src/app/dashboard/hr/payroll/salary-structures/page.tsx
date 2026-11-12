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
import type { SalaryStructure } from "@/lib/types";

export default function SalaryStructuresPage() {
  return (
    <PermissionGate permission="payroll.view">
      <SalaryStructureTable />
    </PermissionGate>
  );
}

function SalaryStructureTable() {
  const { can } = useAuth();

  const { items, meta, loading, error, page, setPage } = useList<SalaryStructure>(
    "/v1/salary-structures"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary structures"
        description="Reusable salary templates by designation. Apply a template to copy pay into staff."
        actions={
          can("payroll.create") ? (
            <Link
              href="/dashboard/hr/payroll/salary-structures/new"
              className={buttonClasses()}
            >
              New structure
            </Link>
          ) : null
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No salary structures yet. Create one to standardise pay by designation." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Salary structures"
                className="min-w-[760px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Designation</Table.Column>
                  <Table.Column>Version</Table.Column>
                  <Table.Column>Basic</Table.Column>
                  <Table.Column>Components</Table.Column>
                  <Table.Column>Currency</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((structure) => (
                    <Table.Row key={structure.id} id={structure.id}>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/hr/payroll/salary-structures/${structure.id}`}
                          className="hover:underline"
                        >
                          {structure.name}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {structure.designation?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        v{structure.version}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatCurrency(Number(structure.basic_salary))}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {structure.items?.length ?? 0}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {structure.currency}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          value={
                            structure.is_active === false ? "inactive" : "active"
                          }
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
