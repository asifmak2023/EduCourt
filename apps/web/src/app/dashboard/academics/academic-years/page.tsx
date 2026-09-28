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
import { formatDate } from "@/lib/format";
import type { AcademicYear } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

export default function AcademicYearsPage() {
  return (
    <PermissionGate permission="academic.view">
      <YearsTable />
    </PermissionGate>
  );
}

function YearsTable() {
  const { can } = useAuth();
  const [status, setStatus] = useState("");

  const filters: Record<string, string | number> = {};
  if (status) filters.status = status;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<AcademicYear>("/v1/academic-years", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic years"
        description="Sessions that scope terms, classes and results."
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search name or code"
              className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            {can("academic.create") ? (
              <Link
                href="/dashboard/academics/academic-years/new"
                className={buttonClasses()}
              >
                New year
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
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No academic years match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Dates</th>
                  <th className="px-5 py-3 font-medium">Terms</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((year) => (
                  <tr key={year.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/academics/academic-years/${year.id}`}
                        className="hover:underline"
                      >
                        {year.name}
                      </Link>
                      {year.is_current ? (
                        <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                          Current
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {year.code}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(year.starts_on)} - {formatDate(year.ends_on)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {year.terms?.length ?? 0}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={year.status} />
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
