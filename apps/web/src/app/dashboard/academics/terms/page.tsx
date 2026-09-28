"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useAcademicYears } from "@/lib/useLookups";
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
import { formatDate } from "@/lib/format";
import type { Term } from "@/lib/types";

export default function TermsPage() {
  return (
    <PermissionGate permission="academic.view">
      <TermsTable />
    </PermissionGate>
  );
}

function TermsTable() {
  const { can } = useAuth();
  const { items: years } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState("");

  const filters: Record<string, string | number> = {};
  if (academicYearId) filters.academic_year_id = Number(academicYearId);

  const { items, meta, loading, error, page, setPage } = useList<Term>(
    "/v1/terms",
    filters
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms"
        description="Teaching blocks inside each academic year."
        actions={
          can("academic.create") ? (
            <Link
              href="/dashboard/academics/terms/new"
              className={buttonClasses()}
            >
              New term
            </Link>
          ) : null
        }
      />

      <div className="w-56">
        <Select
          value={academicYearId}
          onChange={(event) => {
            setPage(1);
            setAcademicYearId(event.target.value);
          }}
        >
          <option value="">All academic years</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No terms match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Academic year</th>
                  <th className="px-5 py-3 font-medium">Sequence</th>
                  <th className="px-5 py-3 font-medium">Dates</th>
                  <th className="px-5 py-3 font-medium">Current</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((term) => (
                  <tr key={term.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {can("academic.edit") ? (
                        <Link
                          href={`/dashboard/academics/terms/${term.id}/edit`}
                          className="hover:underline"
                        >
                          {term.name}
                        </Link>
                      ) : (
                        term.name
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {term.academic_year?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{term.sequence}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(term.starts_on)} - {formatDate(term.ends_on)}
                    </td>
                    <td className="px-5 py-3">
                      {term.is_current ? <Badge value="active" /> : "-"}
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
