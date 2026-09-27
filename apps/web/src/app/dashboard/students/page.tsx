"use client";

import { useList } from "@/lib/useList";
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
import { formatDate } from "@/lib/format";
import type { Student } from "@/lib/types";

export default function StudentsPage() {
  return (
    <PermissionGate permission="student.view">
      <StudentsTable />
    </PermissionGate>
  );
}

function StudentsTable() {
  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Student>("/v1/students");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Student register for the active campus."
        actions={
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search name or admission no"
            className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No students match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Admission no</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Gender</th>
                  <th className="px-5 py-3 font-medium">Date of birth</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {student.admission_no}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {student.full_name}
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-600">
                      {student.gender ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(student.date_of_birth)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={student.status} />
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
