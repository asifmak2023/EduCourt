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
import type { FeePlan } from "@/lib/types";

export default function FeePlansPage() {
  return (
    <PermissionGate permission="fee.view">
      <FeePlansTable />
    </PermissionGate>
  );
}

function FeePlansTable() {
  const { can } = useAuth();

  const { items, meta, loading, error, page, setPage } =
    useList<FeePlan>("/v1/fee-plans");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee plans"
        description="Fee structures by academic year and class, split into installments."
        actions={
          can("fee.create") ? (
            <Link
              href="/dashboard/finance/fee-plans/new"
              className={buttonClasses()}
            >
              New fee plan
            </Link>
          ) : null
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No fee plans match your search." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Fee plans" className="min-w-[860px]">
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Academic year</Table.Column>
                  <Table.Column>Class</Table.Column>
                  <Table.Column>Required total</Table.Column>
                  <Table.Column>Installments</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((plan) => (
                    <Table.Row key={plan.id} id={plan.id}>
                      <Table.Cell className="font-medium text-foreground">
                        {can("fee.edit") ? (
                          <Link
                            href={`/dashboard/finance/fee-plans/${plan.id}/edit`}
                            className="hover:underline"
                          >
                            {plan.name}
                          </Link>
                        ) : (
                          plan.name
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {plan.academic_year?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {plan.class_room?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {plan.totals?.required ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {plan.installments?.length ?? 0}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={plan.is_active === false ? "inactive" : "active"} />
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
