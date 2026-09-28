"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useHostels } from "@/lib/useLookups";
import { Pagination } from "@/components/Pagination";
import { Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { HostelAllocation } from "@/lib/types";

export default function HostelAllocationsPage() {
  const { can } = useAuth();
  const { items: hostels } = useHostels();
  const [hostelId, setHostelId] = useState("");
  const [status, setStatus] = useState("allocated");

  const params: Record<string, string | number> = {};
  if (hostelId) params.hostel_id = hostelId;
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<HostelAllocation>("/v1/hostel-allocations", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel allocations"
        description="Students placed in hostel rooms and beds."
        actions={
          can("hostel.create") ? (
            <Link
              href="/dashboard/hostel/allocations/new"
              className={buttonClasses()}
            >
              New allocation
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            value={hostelId}
            onChange={(event) => {
              setPage(1);
              setHostelId(event.target.value);
            }}
          >
            <option value="">All hostels</option>
            {hostels.map((hostel) => (
              <option key={hostel.id} value={hostel.id}>
                {hostel.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-52">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="allocated">Allocated</option>
            <option value="notice">Notice</option>
            <option value="vacated">Vacated</option>
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No allocations match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Hostel</th>
                  <th className="px-5 py-3 font-medium">Room</th>
                  <th className="px-5 py-3 font-medium">Bed</th>
                  <th className="px-5 py-3 font-medium">Allocated</th>
                  <th className="px-5 py-3 font-medium">Vacated</th>
                  <th className="px-5 py-3 font-medium text-right">Fee</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((allocation) => (
                  <tr key={allocation.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/hostel/allocations/${allocation.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {allocation.student?.full_name ??
                          `#${allocation.student_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.hostel?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.room?.room_no ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.bed_no ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.allocated_on ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.vacated_on ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatCurrency(allocation.monthly_fee)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={allocation.status ?? "unknown"} />
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
