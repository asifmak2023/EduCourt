"use client";

import { useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { Field, Select, TextInput } from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useFiscalYears } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import type { ReportFinancial } from "@/lib/types";

export default function FinancialReportPage() {
  return (
    <PermissionGate permission="report.view">
      <FinancialReport />
    </PermissionGate>
  );
}

function FinancialReport() {
  const { items: fiscalYears } = useFiscalYears();
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (fiscalYearId) params.set("fiscal_year_id", fiscalYearId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const { data, loading, error } = useReport<ReportFinancial>(
    `/v1/reports/financial${query ? `?${query}` : ""}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial report"
        description="Income, expense and surplus from the posted ledger."
      />
      <ReportsTabs active="financial" />

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fiscal year" htmlFor="fin_year">
            <Select
              id="fin_year"
              value={fiscalYearId}
              onChange={(event) => setFiscalYearId(event.target.value)}
            >
              <option value="">All fiscal years</option>
              {fiscalYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From" htmlFor="fin_from">
            <TextInput
              id="fin_from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="fin_to">
            <TextInput
              id="fin_to"
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
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Income"
            value={formatCurrency(data.income)}
            tone="positive"
          />
          <StatCard
            label="Expense"
            value={formatCurrency(data.expense)}
            tone="danger"
          />
          <StatCard
            label="Surplus"
            value={formatCurrency(data.surplus)}
            tone={data.surplus >= 0 ? "positive" : "danger"}
            hint={
              data.surplus_percentage === null
                ? undefined
                : `${data.surplus_percentage}% of income`
            }
          />
        </div>
      ) : null}
    </div>
  );
}
