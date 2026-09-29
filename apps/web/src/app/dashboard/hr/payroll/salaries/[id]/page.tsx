"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
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
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { StaffSalary } from "@/lib/types";

export default function StaffSalaryDetailPage() {
  return (
    <PermissionGate permission="payroll.view">
      <SalaryDetailView />
    </PermissionGate>
  );
}

function SalaryDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error } = useResource<StaffSalary>(
    id ? `/v1/staff-salaries/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Salary structure not found." />;

  const items = data.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.staff_member?.full_name ?? `Salary #${data.id}`}
        description={`Basic ${formatCurrency(Number(data.basic_salary))} ${data.currency}`}
        actions={
          <>
            <Link
              href="/dashboard/hr/payroll/salaries"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("payroll.edit") ? (
              <Link
                href={`/dashboard/hr/payroll/salaries/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_active ? "active" : "inactive"} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem
            label="Staff"
            value={
              data.staff_member
                ? `${data.staff_member.full_name} (${data.staff_member.employee_no})`
                : `#${data.staff_member_id}`
            }
          />
          <DataItem
            label="Basic salary"
            value={formatCurrency(Number(data.basic_salary))}
          />
          <DataItem label="Currency" value={data.currency} />
          <DataItem label="Effective from" value={data.effective_from ?? "-"} />
          <DataItem label="Effective to" value={data.effective_to ?? "-"} />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Component lines ({items.length})
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No component lines." />
          </div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Salary component lines">
                <Table.Header>
                  <Table.Column isRowHeader>Component</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                  <Table.Column className="text-right">Percentage</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((item) => (
                    <Table.Row key={item.id} id={item.id}>
                      <Table.Cell className="text-foreground">
                        {item.component?.name ?? `#${item.salary_component_id}`}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {item.component?.type_label ?? item.component?.type ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {item.amount ? formatCurrency(Number(item.amount)) : "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {item.percentage ? `${item.percentage}%` : "-"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card>

      {can("payroll.delete") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function DeleteAction({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/staff-salaries/${id}`, { method: "DELETE" });
      router.push("/dashboard/hr/payroll/salaries");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Remove</h2>
          <p className="mt-0.5 text-xs text-muted">
            Archive this salary structure.
          </p>
        </div>
        <Button variant="danger" type="button" loading={busy} onClick={remove}>
          Delete
        </Button>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </Card>
  );
}
