"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useVendors } from "@/lib/useLookups";
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
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export default function ExpensesPage() {
  return (
    <PermissionGate permission="finance.view">
      <ExpensesTable />
    </PermissionGate>
  );
}

function ExpensesTable() {
  const { can } = useAuth();
  const { items: vendors } = useVendors();

  const [status, setStatus] = useState("");
  const [vendorId, setVendorId] = useState("");

  const filters: Record<string, string | number> = {};
  if (status) filters.status = status;
  if (vendorId) filters.vendor_id = Number(vendorId);

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Expense>("/v1/expenses", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Vendor bills and other operating expenditure."
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search reference, bill or payee"
              className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/expenses/new"
                className={buttonClasses()}
              >
                New expense
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
        <select
          value={vendorId}
          onChange={(event) => {
            setPage(1);
            setVendorId(event.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">All vendors</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No expenses match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Payee</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Paid</th>
                  <th className="px-5 py-3 text-right font-medium">Outstanding</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      <Link
                        href={`/dashboard/finance/expenses/${expense.id}`}
                        className="hover:underline"
                      >
                        {expense.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {expense.vendor?.name ?? expense.payee_name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(expense.total)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(expense.paid_amount)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(expense.outstanding)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={expense.status} />
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
