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
import { formatCurrency, formatDate } from "@/lib/format";
import type { JournalEntry } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "reversed", label: "Reversed" },
];

export default function JournalPage() {
  return (
    <PermissionGate permission="finance.view">
      <JournalTable />
    </PermissionGate>
  );
}

function JournalTable() {
  const { can } = useAuth();
  const { items: fiscalYears } = useFiscalYears();

  const [status, setStatus] = useState("");
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters: Record<string, string | number> = {};
  if (status) filters.status = status;
  if (fiscalYearId) filters.fiscal_year_id = Number(fiscalYearId);
  if (from) filters.from = from;
  if (to) filters.to = to;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<JournalEntry>("/v1/journal-entries", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        description="Double-entry journal entries; posted entries are immutable."
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search reference or memo"
              className="w-60 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            <Link
              href="/dashboard/finance/accounts"
              className={buttonClasses("secondary")}
            >
              Accounts
            </Link>
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/journal/new"
                className={buttonClasses()}
              >
                New entry
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
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
        <label className="flex items-center gap-2 text-sm text-slate-600">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setPage(1);
              setFrom(event.target.value);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setPage(1);
              setTo(event.target.value);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </label>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No journal entries match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Memo</th>
                  <th className="px-5 py-3 text-right font-medium">Debit</th>
                  <th className="px-5 py-3 text-right font-medium">Credit</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      <Link
                        href={`/dashboard/finance/journal/${entry.id}`}
                        className="hover:underline"
                      >
                        {entry.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(entry.entry_date)}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {entry.memo ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(entry.total_debit)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(entry.total_credit)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={entry.status} />
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
