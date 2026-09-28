"use client";

import Link from "next/link";
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
import type { ExpenseCategory } from "@/lib/types";

export default function ExpenseCategoriesPage() {
  return (
    <PermissionGate permission="finance.view">
      <CategoriesTable />
    </PermissionGate>
  );
}

function CategoriesTable() {
  const { can } = useAuth();

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<ExpenseCategory>("/v1/expense-categories");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense categories"
        description="Map expense lines to ledger accounts."
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search code or name"
              className="w-60 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/expense-categories/new"
                className={buttonClasses()}
              >
                New category
              </Link>
            ) : null}
          </>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No expense categories match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Expense account</th>
                  <th className="px-5 py-3 text-right font-medium">Sort</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {category.code}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {can("finance.edit") ? (
                        <Link
                          href={`/dashboard/finance/expense-categories/${category.id}/edit`}
                          className="hover:underline"
                        >
                          {category.name}
                        </Link>
                      ) : (
                        category.name
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {category.expense_account
                        ? `${category.expense_account.code} - ${category.expense_account.name}`
                        : "Not set"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {category.sort_order}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={category.is_active ? "active" : "inactive"} />
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
