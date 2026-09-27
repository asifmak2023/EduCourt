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
import type { Admission } from "@/lib/types";

export default function AdmissionsPage() {
  return (
    <PermissionGate permission="admission.view">
      <AdmissionsTable />
    </PermissionGate>
  );
}

function AdmissionsTable() {
  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Admission>("/v1/admissions");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        description="Applications and their current stage."
        actions={
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search name, application no or phone"
            className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No applications match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Application no</th>
                  <th className="px-5 py-3 font-medium">Applicant</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Guardian phone</th>
                  <th className="px-5 py-3 font-medium">Applied</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((admission) => (
                  <tr key={admission.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {admission.application_no}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {admission.full_name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {admission.class_room ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {admission.guardian_phone ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(admission.applied_on)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={admission.status} />
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
