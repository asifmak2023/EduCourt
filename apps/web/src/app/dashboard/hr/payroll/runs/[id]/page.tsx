"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Field, Select } from "@/components/Form";
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
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payrollOptions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { PayrollRun } from "@/lib/types";

export default function PayrollRunDetailPage() {
  return (
    <PermissionGate permission="payroll.view">
      <RunDetailView />
    </PermissionGate>
  );
}

function RunDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<PayrollRun>(
    id ? `/v1/payroll-runs/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Payroll run not found." />;

  const payslips = data.payslips ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payroll ${data.period}`}
        description={data.status_label ?? "Monthly payroll run"}
        actions={
          <Link
            href="/dashboard/hr/payroll/runs"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status ?? "unknown"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Gross" value={Number(data.total_gross)} />
        <Stat label="Deductions" value={Number(data.total_deductions)} />
        <Stat label="Net" value={Number(data.total_net)} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Period" value={data.period} />
          <DataItem label="Status" value={data.status_label ?? data.status ?? "-"} />
          <DataItem label="Payslips" value={String(payslips.length)} />
          <DataItem label="Approved at" value={formatDateTime(data.approved_at)} />
          <DataItem label="Paid at" value={formatDateTime(data.paid_at)} />
          <DataItem label="Payment method" value={data.payment_method ?? "-"} />
          <DataItem
            label="Journal entry"
            value={data.journal_entry_id ? `#${data.journal_entry_id}` : "-"}
          />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      {data.status === "draft" ? (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Generation
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Generate payslips from active salary structures, then approve the
            run.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {can("payroll.edit") ? (
              <RunAction
                id={data.id}
                path="generate"
                label="Generate payslips"
                onChanged={reload}
              />
            ) : null}
            {can("payroll.approve") ? (
              <RunAction
                id={data.id}
                path="approve"
                label="Approve run"
                onChanged={reload}
              />
            ) : null}
          </div>
        </Card>
      ) : null}

      {data.status === "approved" && can("payroll.approve") ? (
        <PayAction id={data.id} onChanged={reload} />
      ) : null}

      <Card>
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Payslips ({payslips.length})
          </h2>
        </div>
        {payslips.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No payslips generated yet." />
          </div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Payslips">
                <Table.Header>
                  <Table.Column isRowHeader>Staff</Table.Column>
                  <Table.Column className="text-right">Basic</Table.Column>
                  <Table.Column className="text-right">Gross</Table.Column>
                  <Table.Column className="text-right">Deductions</Table.Column>
                  <Table.Column className="text-right">Net</Table.Column>
                </Table.Header>
                <Table.Body>
                  {payslips.map((payslip) => (
                    <Table.Row key={payslip.id} id={payslip.id}>
                      <Table.Cell>
                        <Link
                          href={`/dashboard/hr/payroll/payslips/${payslip.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {payslip.staff_member?.full_name ??
                            `#${payslip.staff_member_id}`}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatCurrency(Number(payslip.basic))}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatCurrency(Number(payslip.gross))}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatCurrency(Number(payslip.deductions))}
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-foreground">
                        {formatCurrency(Number(payslip.net))}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card>

      {can("payroll.delete") && data.status === "draft" ? (
        <DeleteAction id={data.id} />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-foreground">
        {formatCurrency(value)}
      </p>
    </Card>
  );
}

function RunAction({
  id,
  path,
  label,
  onChanged,
}: {
  id: number;
  path: string;
  label: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/payroll-runs/${id}/${path}`, { method: "POST" });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to run action.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button type="button" loading={busy} onClick={run}>
        {label}
      </Button>
      {error ? (
        <div className="mt-2">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </div>
  );
}

function PayAction({ id, onChanged }: { id: number; onChanged: () => void }) {
  const [method, setMethod] = useState("bank_transfer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/payroll-runs/${id}/pay`, {
        method: "POST",
        body: { payment_method: method },
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to mark paid.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Mark paid</h2>
      <p className="mt-0.5 text-xs text-muted">
        Post the payment to the ledger and close the run.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <Field label="Payment method" htmlFor="pay_method">
          <Select
            id="pay_method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="button" loading={busy} onClick={pay}>
          Mark paid
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

function DeleteAction({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/payroll-runs/${id}`, { method: "DELETE" });
      router.push("/dashboard/hr/payroll/runs");
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
            Only draft runs can be removed.
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
