"use client";

import { useState } from "react";
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
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Period</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Gross</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Deductions
                    </th>
                    <th className="px-5 py-3 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.by_period.length === 0 ? (
                    <tr>
                      <td className="px-5 py-3 text-slate-500" colSpan={5}>
                        No payroll runs for this selection.
                      </td>
                    </tr>
                  ) : (
                    data.by_period.map((run) => (
                      <tr key={run.id}>
                        <td className="px-5 py-3 text-slate-900">{run.period}</td>
                        <td className="px-5 py-3">
                          <Badge value={run.status ?? "unknown"} />
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatCurrency(run.gross)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatCurrency(run.deductions)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatCurrency(run.net)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
