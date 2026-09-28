"use client";

import { useState } from "react";
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
import { humanize } from "@/lib/format";
import type { ChartOfAccount } from "@/lib/types";

const ACCOUNT_TYPES = [
  { value: "", label: "All types" },
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export default function ChartOfAccountsPage() {
  return (
    <PermissionGate permission="finance.view">
      <AccountsTable />
    </PermissionGate>
  );
}

function AccountsTable() {
  const { can } = useAuth();
  const [type, setType] = useState("");

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<ChartOfAccount>(
      "/v1/chart-of-accounts",
      type === "" ? {} : { account_type: type }
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of accounts"
        description="Ledger accounts available for journal postings."
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
            <Link
              href="/dashboard/finance/journal"
              className={buttonClasses("secondary")}
            >
              Journal
            </Link>
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/accounts/new"
                className={buttonClasses()}
              >
                New account
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <select
          value={type}
          onChange={(event) => {
            setPage(1);
            setType(event.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {ACCOUNT_TYPES.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No accounts match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Normal</th>
                  <th className="px-5 py-3 font-medium">Kind</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      <Link
                        href={`/dashboard/finance/accounts/${account.id}`}
                        className="hover:underline"
                      >
                        {account.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/finance/accounts/${account.id}`}
                        className="hover:underline"
                      >
                        {account.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {humanize(account.account_type)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {humanize(account.normal_balance)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {account.is_group ? "Group" : "Postable"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={account.is_active ? "active" : "inactive"} />
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
