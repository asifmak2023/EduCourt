"use client";

import { useState } from "react";
import { Table } from "@heroui/react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { Field, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useReport } from "@/lib/useReport";
import type { ReportPayroll } from "@/lib/types";

export default function PayrollReportPage() {
  return (
    <PermissionGate permission="report.view">
      <PayrollReport />
    </PermissionGate>
  );
}

function PayrollReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const { data, loading, error } = useReport<ReportPayroll>(
    `/v1/reports/payroll${query ? `?${query}` : ""}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll report"
        description="Payroll cost by period with gross, deductions and net."
      />
      <ReportsTabs active="payroll" />

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From" htmlFor="pay_from">
            <TextInput
              id="pay_from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="pay_to">
            <TextInput
              id="pay_to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Payroll runs" value={data.totals.runs} />
            <StatCard label="Gross" value={formatCurrency(data.totals.gross)} />
            <StatCard
              label="Deductions"
              value={formatCurrency(data.totals.deductions)}
            />
            <StatCard
              label="Net"
              value={formatCurrency(data.totals.net)}
              tone="positive"
            />
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Payroll runs">
                  <Table.Header>
                    <Table.Column isRowHeader>Period</Table.Column>
                    <Table.Column>Status</Table.Column>
                    <Table.Column className="text-right">Gross</Table.Column>
                    <Table.Column className="text-right">Deductions</Table.Column>
                    <Table.Column className="text-right">Net</Table.Column>
                  </Table.Header>
                  <Table.Body>
                  {data.by_period.length === 0 ? (
                    <Table.Row id="row-1">
                      <Table.Cell className="text-muted">No payroll runs for this selection.</Table.Cell><Table.Cell /><Table.Cell /><Table.Cell /><Table.Cell />
                    </Table.Row>
                  ) : (
                    data.by_period.map((run) => (
                      <Table.Row key={run.id} id={run.id}>
                        <Table.Cell className="text-foreground">{run.period}</Table.Cell>
                        <Table.Cell><Badge value={run.status ?? "unknown"} /></Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatCurrency(run.gross)}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatCurrency(run.deductions)}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatCurrency(run.net)}</Table.Cell>
                      </Table.Row>
                    ))
                  )}
                  </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
