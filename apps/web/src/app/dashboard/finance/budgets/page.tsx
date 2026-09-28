"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useFiscalYears } from "@/lib/useLookups";
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
import { Select, buttonClasses } from "@/components/Form";
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import type { Budget } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "closed", label: "Closed" },
];

export default function BudgetsPage() {
  return (
    <PermissionGate permission="finance.view">
      <BudgetsTable />
    </PermissionGate>
  );
}

function BudgetsTable() {
  const { can } = useAuth();
  const { items: fiscalYears } = useFiscalYears();

  const [status, setStatus] = useState("");
  const [fiscalYearId, setFiscalYearId] = useState("");

  const filters: Record<string, string | number> = {};
  if (status) filters.status = status;
  if (fiscalYearId) filters.fiscal_year_id = Number(fiscalYearId);

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Budget>("/v1/budgets", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Planned spend per account, measured against actuals."
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search budget name"
              className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/budgets/new"
                className={buttonClasses()}
              >
                New budget
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {STATUSES.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="w-52">
          <Select
            value={fiscalYearId}
            onChange={(event) => {
              setPage(1);
              setFiscalYearId(event.target.value);
            }}
          >
            <option value="">All fiscal years</option>
            {fiscalYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name} ({year.code})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No budgets match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Fiscal year</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Dates</th>
                  <th className="px-5 py-3 text-right font-medium">Budget</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((budget) => (
                  <tr key={budget.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/finance/budgets/${budget.id}`}
                        className="hover:underline"
                      >
                        {budget.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {budget.fiscal_year?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {humanize(budget.period_type)}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(budget.starts_on)} - {formatDate(budget.ends_on)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(budget.total_budget)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={budget.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
